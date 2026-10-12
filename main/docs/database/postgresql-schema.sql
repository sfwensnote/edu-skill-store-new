-- 教学工坊 PostgreSQL 设计稿，2026-10-12。
-- 尚未作为迁移执行；目标 PostgreSQL 17。正式实施时拆为 Alembic 迁移。
-- UUID、SHA-256 摘要由服务端生成；无默认账号、密钥或业务样例。
BEGIN;
CREATE SCHEMA workshop;
SET LOCAL search_path TO workshop, public;

CREATE TABLE accounts (
    id uuid PRIMARY KEY,
    login_name text NOT NULL UNIQUE CHECK (length(login_name) BETWEEN 3 AND 100),
    display_name text NOT NULL CHECK (length(display_name) BETWEEN 1 AND 100),
    password_hash text NOT NULL,
    role text NOT NULL CHECK (role IN ('teacher', 'admin')),
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE account_sessions (
    id uuid PRIMARY KEY,
    account_id uuid NOT NULL REFERENCES accounts(id),
    token_hash bytea NOT NULL UNIQUE CHECK (octet_length(token_hash) = 32),
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (expires_at > created_at)
);
CREATE INDEX account_sessions_account_idx ON account_sessions(account_id, expires_at);
CREATE TABLE api_requests (
    id uuid PRIMARY KEY,
    owner_id uuid NOT NULL REFERENCES accounts(id),
    request_key uuid NOT NULL,
    operation text NOT NULL,
    payload_hash bytea NOT NULL CHECK (octet_length(payload_hash) = 32),
    status text NOT NULL CHECK (status IN ('started', 'complete', 'failed')),
    resource_type text,
    resource_id uuid,
    response_status integer CHECK (response_status BETWEEN 200 AND 599),
    error_code text,
    created_at timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz,
    UNIQUE (owner_id, operation, request_key),
    CHECK ((resource_type IS NULL) = (resource_id IS NULL))
);

-- 一行表示不可变的模型配置版本，credential_ref 是私有配置的引用名。
CREATE TABLE model_profiles (
    id uuid PRIMARY KEY,
    name text NOT NULL,
    purpose text NOT NULL CHECK (purpose IN ('design', 'teaching')),
    base_url text NOT NULL,
    model_name text NOT NULL,
    credential_ref text NOT NULL,
    config_hash bytea NOT NULL CHECK (octet_length(config_hash) = 32),
    prompt_policy text NOT NULL,
    parameters jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(parameters) = 'object'),
    enabled boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (purpose, config_hash)
);
CREATE TABLE skills (
    id uuid PRIMARY KEY,
    owner_id uuid NOT NULL REFERENCES accounts(id),
    current_revision_id uuid,
    deleted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (id, owner_id)
);
CREATE TABLE skill_revisions (
    id uuid PRIMARY KEY,
    skill_id uuid NOT NULL,
    author_id uuid NOT NULL,
    revision_no integer NOT NULL CHECK (revision_no > 0),
    state text NOT NULL CHECK (state IN ('draft', 'formed')),
    name text NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
    introduction text NOT NULL,
    idea text NOT NULL,
    stage text NOT NULL,
    subject text NOT NULL,
    category text NOT NULL CHECK (category IN ('课堂提问', '错因辅导', '智能练习', '知识讲解')),
    tags text[] NOT NULL DEFAULT '{}',
    problem text NOT NULL,
    learning_goal text NOT NULL,
    trigger_condition text NOT NULL,
    steps jsonb NOT NULL CHECK (jsonb_typeof(steps) = 'array'),
    principles text[] NOT NULL DEFAULT '{}',
    ending_condition text NOT NULL,
    icon jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(icon) = 'object'),
    compiled_instructions text NOT NULL,
    content_hash bytea NOT NULL CHECK (octet_length(content_hash) = 32),
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (skill_id, author_id) REFERENCES skills(id, owner_id),
    UNIQUE (skill_id, revision_no),
    UNIQUE (id, skill_id),
    UNIQUE (id, skill_id, author_id),
    CHECK (state <> 'formed' OR (
        length(trim(introduction)) > 0 AND length(trim(idea)) > 0 AND length(trim(stage)) > 0
        AND length(trim(subject)) > 0 AND cardinality(tags) BETWEEN 1 AND 5
        AND length(trim(problem)) > 0 AND length(trim(learning_goal)) > 0
        AND length(trim(trigger_condition)) > 0 AND jsonb_array_length(steps) BETWEEN 1 AND 8
        AND length(trim(ending_condition)) > 0 AND length(trim(compiled_instructions)) > 0
    ))
);
ALTER TABLE skills ADD CONSTRAINT skills_current_revision_fk
    FOREIGN KEY (current_revision_id, id) REFERENCES skill_revisions(id, skill_id)
    DEFERRABLE INITIALLY DEFERRED;
CREATE TABLE creation_drafts (
    id uuid PRIMARY KEY,
    owner_id uuid NOT NULL REFERENCES accounts(id),
    skill_id uuid,
    form_data jsonb NOT NULL CHECK (jsonb_typeof(form_data) = 'object'),
    conversation jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(conversation) = 'array'),
    question_cursor integer NOT NULL CHECK (question_cursor BETWEEN 0 AND 7),
    lock_version integer NOT NULL DEFAULT 1 CHECK (lock_version > 0),
    updated_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (skill_id, owner_id) REFERENCES skills(id, owner_id)
);

-- 发布、添加都固定到某个修订；作者更新不改写他人的添加快照。
CREATE TABLE publications (
    id uuid PRIMARY KEY,
    author_id uuid NOT NULL REFERENCES accounts(id),
    skill_id uuid NOT NULL,
    skill_revision_id uuid NOT NULL,
    detection_id uuid NOT NULL,
    model_profile_id uuid NOT NULL REFERENCES model_profiles(id),
    status text NOT NULL CHECK (status IN ('published', 'withdrawn')),
    published_at timestamptz NOT NULL DEFAULT now(),
    withdrawn_at timestamptz,
    FOREIGN KEY (skill_revision_id, skill_id, author_id) REFERENCES skill_revisions(id, skill_id, author_id),
    UNIQUE (id, skill_id, skill_revision_id),
    CHECK ((status = 'withdrawn') = (withdrawn_at IS NOT NULL))
);
CREATE UNIQUE INDEX publications_active_skill_idx ON publications(skill_id) WHERE status = 'published';
CREATE INDEX publications_catalog_idx ON publications(status, published_at DESC);
CREATE TABLE workspace_entries (
    id uuid PRIMARY KEY,
    owner_id uuid NOT NULL REFERENCES accounts(id),
    source text NOT NULL CHECK (source IN ('created', 'market')),
    skill_id uuid NOT NULL,
    skill_revision_id uuid NOT NULL,
    author_id uuid NOT NULL,
    publication_id uuid,
    removed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (skill_revision_id, skill_id, author_id) REFERENCES skill_revisions(id, skill_id, author_id),
    FOREIGN KEY (publication_id, skill_id, skill_revision_id) REFERENCES publications(id, skill_id, skill_revision_id),
    UNIQUE (id, owner_id),
    UNIQUE (id, owner_id, skill_id),
    CHECK ((source = 'created' AND author_id = owner_id AND publication_id IS NULL)
        OR (source = 'market' AND publication_id IS NOT NULL))
);
CREATE UNIQUE INDEX workspace_entries_active_skill_idx ON workspace_entries(owner_id, skill_id) WHERE removed_at IS NULL;
CREATE INDEX workspace_entries_list_idx ON workspace_entries(owner_id, source, created_at DESC) WHERE removed_at IS NULL;
CREATE TABLE favorites (
    id uuid PRIMARY KEY,
    owner_id uuid NOT NULL REFERENCES accounts(id),
    entry_id uuid,
    publication_id uuid REFERENCES publications(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (entry_id, owner_id) REFERENCES workspace_entries(id, owner_id),
    CHECK (num_nonnulls(entry_id, publication_id) = 1)
);
CREATE UNIQUE INDEX favorites_entry_idx ON favorites(owner_id, entry_id) WHERE entry_id IS NOT NULL;
CREATE UNIQUE INDEX favorites_publication_idx ON favorites(owner_id, publication_id) WHERE publication_id IS NOT NULL;

CREATE TABLE materials (
    id uuid PRIMARY KEY,
    owner_id uuid NOT NULL REFERENCES accounts(id),
    filename text NOT NULL,
    media_type text NOT NULL,
    byte_size bigint NOT NULL CHECK (byte_size > 0),
    object_key text NOT NULL UNIQUE,
    content_hash bytea NOT NULL CHECK (octet_length(content_hash) = 32),
    parse_status text NOT NULL CHECK (parse_status IN ('pending', 'ready', 'unsupported', 'failed')),
    extracted_text text,
    parser_version text,
    error_code text,
    deleted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (id, owner_id),
    CHECK (parse_status <> 'ready' OR (extracted_text IS NOT NULL AND parser_version IS NOT NULL))
);
CREATE TABLE companions (
    id uuid PRIMARY KEY,
    owner_id uuid NOT NULL REFERENCES accounts(id),
    current_revision_id uuid,
    deleted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (id, owner_id)
);
CREATE TABLE companion_revisions (
    id uuid PRIMARY KEY,
    companion_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    revision_no integer NOT NULL CHECK (revision_no > 0),
    state text NOT NULL CHECK (state IN ('draft', 'ready')),
    editor_step integer NOT NULL CHECK (editor_step BETWEEN 1 AND 4),
    name text NOT NULL,
    introduction text NOT NULL,
    stage text NOT NULL,
    subject text NOT NULL,
    grade text,
    avatar jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(avatar) = 'object'),
    audience text NOT NULL,
    scenario text NOT NULL,
    task_and_goals text NOT NULL,
    activity_options jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(activity_options) = 'object'),
    model_profile_id uuid NOT NULL REFERENCES model_profiles(id),
    content_hash bytea NOT NULL CHECK (octet_length(content_hash) = 32),
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (companion_id, owner_id) REFERENCES companions(id, owner_id),
    UNIQUE (companion_id, revision_no),
    UNIQUE (id, companion_id),
    UNIQUE (id, owner_id),
    UNIQUE (id, owner_id, model_profile_id),
    CHECK (state <> 'ready' OR (length(trim(name)) > 0 AND length(trim(introduction)) > 0
        AND length(trim(stage)) > 0 AND length(trim(subject)) > 0 AND length(trim(audience)) > 0
        AND length(trim(scenario)) > 0 AND length(trim(task_and_goals)) > 0))
);
ALTER TABLE companions ADD CONSTRAINT companions_current_revision_fk
    FOREIGN KEY (current_revision_id, id) REFERENCES companion_revisions(id, companion_id)
    DEFERRABLE INITIALLY DEFERRED;
CREATE TABLE companion_revision_skills (
    companion_revision_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    entry_id uuid NOT NULL,
    skill_id uuid NOT NULL,
    skill_revision_id uuid NOT NULL,
    position integer NOT NULL CHECK (position BETWEEN 0 AND 7),
    PRIMARY KEY (companion_revision_id, entry_id),
    FOREIGN KEY (companion_revision_id, owner_id) REFERENCES companion_revisions(id, owner_id),
    FOREIGN KEY (entry_id, owner_id, skill_id) REFERENCES workspace_entries(id, owner_id, skill_id),
    FOREIGN KEY (skill_revision_id, skill_id) REFERENCES skill_revisions(id, skill_id),
    UNIQUE (companion_revision_id, position),
    UNIQUE (companion_revision_id, entry_id, skill_revision_id)
);
CREATE TABLE companion_revision_materials (
    companion_revision_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    material_id uuid NOT NULL,
    position integer NOT NULL CHECK (position >= 0),
    PRIMARY KEY (companion_revision_id, material_id),
    FOREIGN KEY (companion_revision_id, owner_id) REFERENCES companion_revisions(id, owner_id),
    FOREIGN KEY (material_id, owner_id) REFERENCES materials(id, owner_id),
    UNIQUE (companion_revision_id, position)
);

CREATE TABLE detections (
    id uuid PRIMARY KEY,
    owner_id uuid NOT NULL REFERENCES accounts(id),
    entry_id uuid NOT NULL,
    skill_id uuid NOT NULL,
    skill_revision_id uuid NOT NULL,
    teaching_model_id uuid NOT NULL REFERENCES model_profiles(id),
    design_model_id uuid NOT NULL REFERENCES model_profiles(id),
    prompt_policy text NOT NULL,
    fingerprint bytea NOT NULL CHECK (octet_length(fingerprint) = 32),
    status text NOT NULL CHECK (status IN ('queued', 'running', 'review', 'failed', 'verified', 'cancelled')),
    system_passed boolean NOT NULL DEFAULT false,
    error_code text,
    confirmed_by uuid REFERENCES accounts(id),
    confirmed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz,
    FOREIGN KEY (entry_id, owner_id, skill_id) REFERENCES workspace_entries(id, owner_id, skill_id),
    FOREIGN KEY (skill_revision_id, skill_id) REFERENCES skill_revisions(id, skill_id),
    UNIQUE (id, owner_id, skill_revision_id, teaching_model_id),
    CHECK ((status = 'verified') = (confirmed_at IS NOT NULL)),
    CHECK ((confirmed_by IS NOT NULL) = (confirmed_at IS NOT NULL)),
    CHECK (confirmed_by IS NULL OR confirmed_by = owner_id),
    CHECK (status NOT IN ('review', 'verified') OR system_passed)
);
CREATE INDEX detections_latest_idx ON detections(owner_id, entry_id, created_at DESC, id DESC);
ALTER TABLE publications ADD CONSTRAINT publications_detection_fk
    FOREIGN KEY (detection_id, author_id, skill_revision_id, model_profile_id)
    REFERENCES detections(id, owner_id, skill_revision_id, teaching_model_id);
CREATE TABLE detection_cases (
    id uuid PRIMARY KEY,
    detection_id uuid NOT NULL REFERENCES detections(id),
    position integer NOT NULL CHECK (position >= 0),
    kind text NOT NULL CHECK (kind IN ('trigger', 'nontrigger', 'step', 'principle', 'ending')),
    target_position integer NOT NULL CHECK (target_position >= 0),
    title text NOT NULL,
    scenario text NOT NULL,
    student_turns jsonb NOT NULL CHECK (jsonb_typeof(student_turns) = 'array'),
    expected text NOT NULL,
    status text NOT NULL CHECK (status IN ('pending', 'running', 'complete', 'failed')),
    UNIQUE (detection_id, position)
);
CREATE TABLE detection_messages (
    id uuid PRIMARY KEY,
    case_id uuid NOT NULL REFERENCES detection_cases(id),
    ordinal integer NOT NULL CHECK (ordinal >= 0),
    role text NOT NULL CHECK (role IN ('user', 'assistant')),
    content text NOT NULL,
    activation_trace jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(activation_trace) = 'array'),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (case_id, ordinal),
    UNIQUE (id, case_id)
);
CREATE TABLE detection_verdicts (
    id uuid PRIMARY KEY,
    case_id uuid NOT NULL REFERENCES detection_cases(id),
    dimension text NOT NULL CHECK (dimension IN ('trigger', 'steps', 'principles', 'ending')),
    status text NOT NULL CHECK (status IN ('pass', 'fail', 'uncertain', 'not-applicable')),
    reason text NOT NULL,
    UNIQUE (case_id, dimension),
    UNIQUE (id, case_id)
);
CREATE TABLE detection_evidence (
    verdict_id uuid NOT NULL,
    case_id uuid NOT NULL,
    message_id uuid NOT NULL,
    quote text NOT NULL CHECK (length(quote) > 0),
    PRIMARY KEY (verdict_id, message_id),
    FOREIGN KEY (verdict_id, case_id) REFERENCES detection_verdicts(id, case_id),
    FOREIGN KEY (message_id, case_id) REFERENCES detection_messages(id, case_id)
);

CREATE TABLE trials (
    id uuid PRIMARY KEY,
    owner_id uuid NOT NULL REFERENCES accounts(id),
    companion_id uuid NOT NULL,
    companion_revision_id uuid NOT NULL,
    model_profile_id uuid NOT NULL REFERENCES model_profiles(id),
    status text NOT NULL CHECK (status IN ('open', 'closed', 'revoked', 'expired')),
    capacity integer NOT NULL CHECK (capacity BETWEEN 1 AND 30),
    expires_at timestamptz NOT NULL,
    closed_at timestamptz,
    -- 保存当次已解析材料正文及模型上下文；不存文件二进制或密钥。
    context_snapshot jsonb NOT NULL CHECK (jsonb_typeof(context_snapshot) = 'object'),
    snapshot_hash bytea NOT NULL CHECK (octet_length(snapshot_hash) = 32),
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (companion_id, owner_id) REFERENCES companions(id, owner_id),
    FOREIGN KEY (companion_revision_id, companion_id) REFERENCES companion_revisions(id, companion_id),
    FOREIGN KEY (companion_revision_id, owner_id, model_profile_id) REFERENCES companion_revisions(id, owner_id, model_profile_id),
    UNIQUE (id, owner_id),
    UNIQUE (id, owner_id, companion_revision_id, model_profile_id),
    CHECK (expires_at > created_at AND expires_at <= created_at + interval '7 days'),
    CHECK ((status = 'open') = (closed_at IS NULL))
);
CREATE INDEX trials_owner_companion_idx ON trials(owner_id, companion_id, created_at DESC);
CREATE TABLE trial_skills (
    trial_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    companion_revision_id uuid NOT NULL,
    entry_id uuid NOT NULL,
    skill_revision_id uuid NOT NULL,
    model_profile_id uuid NOT NULL,
    detection_id uuid NOT NULL,
    PRIMARY KEY (trial_id, entry_id),
    FOREIGN KEY (trial_id, owner_id, companion_revision_id, model_profile_id)
        REFERENCES trials(id, owner_id, companion_revision_id, model_profile_id),
    FOREIGN KEY (companion_revision_id, entry_id, skill_revision_id)
        REFERENCES companion_revision_skills(companion_revision_id, entry_id, skill_revision_id),
    FOREIGN KEY (detection_id, owner_id, skill_revision_id, model_profile_id)
        REFERENCES detections(id, owner_id, skill_revision_id, teaching_model_id)
);
CREATE TABLE trial_invitations (
    id uuid PRIMARY KEY,
    trial_id uuid NOT NULL REFERENCES trials(id),
    token_hash bytea NOT NULL UNIQUE CHECK (octet_length(token_hash) = 32),
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (expires_at > created_at)
);
CREATE UNIQUE INDEX trial_active_invitation_idx ON trial_invitations(trial_id) WHERE revoked_at IS NULL;
CREATE TABLE trial_sessions (
    id uuid PRIMARY KEY,
    trial_id uuid NOT NULL REFERENCES trials(id),
    audience text NOT NULL CHECK (audience IN ('teacher', 'student')),
    display_name text NOT NULL,
    join_request_id uuid,
    token_hash bytea UNIQUE CHECK (token_hash IS NULL OR octet_length(token_hash) = 32),
    credential_version text,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (id, trial_id),
    UNIQUE (trial_id, join_request_id),
    CHECK ((audience = 'student' AND token_hash IS NOT NULL AND join_request_id IS NOT NULL AND credential_version IS NOT NULL)
        OR (audience = 'teacher' AND token_hash IS NULL AND join_request_id IS NULL AND credential_version IS NULL))
);
CREATE UNIQUE INDEX trial_teacher_session_idx ON trial_sessions(trial_id) WHERE audience = 'teacher';
CREATE INDEX trial_sessions_trial_idx ON trial_sessions(trial_id, audience, created_at);
CREATE TABLE trial_turns (
    id uuid PRIMARY KEY,
    session_id uuid NOT NULL,
    trial_id uuid NOT NULL,
    request_id uuid NOT NULL,
    payload_hash bytea NOT NULL CHECK (octet_length(payload_hash) = 32),
    status text NOT NULL CHECK (status IN ('pending', 'running', 'complete', 'failed', 'cancelled')),
    created_at timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz,
    FOREIGN KEY (session_id, trial_id) REFERENCES trial_sessions(id, trial_id),
    UNIQUE (session_id, request_id),
    UNIQUE (id, session_id, trial_id)
);
CREATE UNIQUE INDEX trial_turns_one_pending_idx ON trial_turns(session_id) WHERE status IN ('pending', 'running');
CREATE TABLE trial_turn_attempts (
    id uuid PRIMARY KEY,
    turn_id uuid NOT NULL REFERENCES trial_turns(id),
    attempt_no integer NOT NULL CHECK (attempt_no > 0),
    status text NOT NULL CHECK (status IN ('running', 'complete', 'failed', 'indeterminate')),
    provider_request_id text,
    error_code text,
    error_detail text,
    started_at timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz,
    UNIQUE (turn_id, attempt_no)
);
CREATE TABLE trial_messages (
    id uuid PRIMARY KEY,
    trial_id uuid NOT NULL,
    session_id uuid NOT NULL,
    turn_id uuid NOT NULL,
    ordinal integer NOT NULL CHECK (ordinal >= 0),
    role text NOT NULL CHECK (role IN ('user', 'assistant')),
    content text NOT NULL CHECK (length(content) > 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (turn_id, session_id, trial_id) REFERENCES trial_turns(id, session_id, trial_id),
    UNIQUE (session_id, ordinal),
    UNIQUE (turn_id, role),
    UNIQUE (id, trial_id),
    UNIQUE (id, trial_id, session_id)
);
CREATE INDEX trial_messages_transcript_idx ON trial_messages(session_id, ordinal);
CREATE TABLE skill_activations (
    id uuid PRIMARY KEY,
    trial_id uuid NOT NULL,
    session_id uuid NOT NULL,
    assistant_message_id uuid NOT NULL,
    entry_id uuid NOT NULL,
    step_position integer NOT NULL CHECK (step_position >= 0),
    ended boolean NOT NULL,
    reason text NOT NULL,
    FOREIGN KEY (assistant_message_id, trial_id, session_id) REFERENCES trial_messages(id, trial_id, session_id),
    FOREIGN KEY (trial_id, entry_id) REFERENCES trial_skills(trial_id, entry_id),
    UNIQUE (assistant_message_id, entry_id),
    UNIQUE (id, trial_id, session_id)
);
CREATE TABLE activation_evidence (
    activation_id uuid NOT NULL,
    trial_id uuid NOT NULL,
    session_id uuid NOT NULL,
    message_id uuid NOT NULL,
    quote text NOT NULL CHECK (length(quote) > 0),
    PRIMARY KEY (activation_id, message_id),
    FOREIGN KEY (activation_id, trial_id, session_id) REFERENCES skill_activations(id, trial_id, session_id),
    FOREIGN KEY (message_id, trial_id, session_id) REFERENCES trial_messages(id, trial_id, session_id)
);

CREATE TABLE reports (
    id uuid PRIMARY KEY,
    trial_id uuid NOT NULL REFERENCES trials(id),
    version_no integer NOT NULL CHECK (version_no > 0),
    status text NOT NULL CHECK (status IN ('queued', 'running', 'ready', 'failed')),
    input_hash bytea NOT NULL CHECK (octet_length(input_hash) = 32),
    input_snapshot jsonb NOT NULL CHECK (jsonb_typeof(input_snapshot) = 'object'),
    design_model_id uuid NOT NULL REFERENCES model_profiles(id),
    student_count integer NOT NULL CHECK (student_count >= 0),
    turn_count integer NOT NULL CHECK (turn_count >= 0),
    limitation text NOT NULL CHECK (length(limitation) > 0),
    error_code text,
    created_at timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz,
    UNIQUE (trial_id, version_no),
    UNIQUE (id, trial_id)
);
CREATE TABLE report_findings (
    id uuid PRIMARY KEY,
    report_id uuid NOT NULL,
    trial_id uuid NOT NULL,
    aspect text NOT NULL CHECK (aspect IN ('learning', 'skill', 'runtime')),
    severity text NOT NULL CHECK (severity IN ('observation', 'concern')),
    description text NOT NULL,
    FOREIGN KEY (report_id, trial_id) REFERENCES reports(id, trial_id),
    UNIQUE (id, trial_id)
);
CREATE TABLE report_evidence (
    finding_id uuid NOT NULL,
    trial_id uuid NOT NULL,
    message_id uuid NOT NULL,
    quote text NOT NULL CHECK (length(quote) > 0),
    PRIMARY KEY (finding_id, message_id),
    FOREIGN KEY (finding_id, trial_id) REFERENCES report_findings(id, trial_id),
    FOREIGN KEY (message_id, trial_id) REFERENCES trial_messages(id, trial_id)
);
CREATE TABLE report_reviews (
    id uuid PRIMARY KEY,
    report_id uuid NOT NULL,
    trial_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    decision text NOT NULL CHECK (decision IN ('meets-expectations', 'adjust-scene', 'modify-skill', 'expand-trial')),
    note text NOT NULL CHECK (length(trim(note)) > 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (report_id, trial_id) REFERENCES reports(id, trial_id),
    FOREIGN KEY (trial_id, owner_id) REFERENCES trials(id, owner_id)
);

-- 一期可由 PostgreSQL 支撑独立 worker；不在 Web 请求进程内运行长任务。
CREATE TABLE jobs (
    id uuid PRIMARY KEY,
    kind text NOT NULL CHECK (kind IN ('detection', 'turn', 'report', 'material')),
    detection_id uuid REFERENCES detections(id),
    turn_id uuid REFERENCES trial_turns(id),
    report_id uuid REFERENCES reports(id),
    material_id uuid REFERENCES materials(id),
    deduplication_key text NOT NULL UNIQUE,
    status text NOT NULL CHECK (status IN ('queued', 'running', 'complete', 'failed', 'cancelled')),
    attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    max_attempts integer NOT NULL CHECK (max_attempts BETWEEN 1 AND 5),
    available_at timestamptz NOT NULL DEFAULT now(),
    lease_owner text,
    lease_expires_at timestamptz,
    error_code text,
    created_at timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz,
    CHECK ((kind = 'detection' AND detection_id IS NOT NULL AND num_nonnulls(turn_id, report_id, material_id) = 0)
        OR (kind = 'turn' AND turn_id IS NOT NULL AND num_nonnulls(detection_id, report_id, material_id) = 0)
        OR (kind = 'report' AND report_id IS NOT NULL AND num_nonnulls(detection_id, turn_id, material_id) = 0)
        OR (kind = 'material' AND material_id IS NOT NULL AND num_nonnulls(detection_id, turn_id, report_id) = 0)),
    CHECK ((status = 'running' AND lease_owner IS NOT NULL AND lease_expires_at IS NOT NULL)
        OR (status <> 'running' AND lease_owner IS NULL AND lease_expires_at IS NULL))
);
CREATE INDEX jobs_claim_idx ON jobs(available_at, created_at) WHERE status = 'queued';
CREATE INDEX jobs_lease_idx ON jobs(lease_expires_at) WHERE status = 'running';
CREATE TABLE audit_events (
    id uuid PRIMARY KEY,
    actor_id uuid REFERENCES accounts(id),
    owner_id uuid REFERENCES accounts(id),
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id uuid,
    request_id uuid NOT NULL,
    detail jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(detail) = 'object'),
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_events_resource_idx ON audit_events(resource_type, resource_id, created_at DESC);
CREATE TABLE workspace_imports (
    id uuid PRIMARY KEY,
    owner_id uuid NOT NULL REFERENCES accounts(id),
    source_key text NOT NULL,
    source_id text NOT NULL,
    source_hash bytea NOT NULL CHECK (octet_length(source_hash) = 32),
    target_type text NOT NULL CHECK (target_type IN ('skill', 'entry', 'companion', 'material')),
    target_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (owner_id, source_key, source_id)
);

-- 历史方法、试用和证据默认不物理删除；无 ON DELETE CASCADE。
-- 鉴权、不可变修订、最新检测资格、容量锁、逐字引用等服务端事务规则见配套文档。
COMMIT;
