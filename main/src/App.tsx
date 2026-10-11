import { useEffect, useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { LibraryPage } from '@/features/library/LibraryPage';
import { LibraryDetailPage } from '@/features/library/LibraryDetailPage';
import { DesignerPage } from '@/features/designer/DesignerPage';
import { TestingPage } from '@/features/testing/TestingPage';
import { LogsPage } from '@/features/usage/LogsPage';
import { LogDetailPage } from '@/features/usage/LogDetailPage';
import { ReportPage } from '@/features/usage/ReportPage';
import { UsePage } from '@/features/usage/UsePage';
import { StudentPreviewPage } from '@/features/usage/StudentPreviewPage';
import { MethodTrialRecord } from '@/features/usage/MethodTrialRecord';
import { libraryAssistants } from '@/data/platform';
import { useDemoPlatform } from '@/hooks/useDemoPlatform';
import { methodPreviewCases } from '../shared/method-preview';
import { useAppRoute } from '@/hooks/useAppRoute';
import { usePageFocus } from '@/hooks/usePageFocus';
import {
  goTo,
  readRoute,
  routeHash,
  returnRoute,
  returnLabel,
  navigationRoute,
  activeNavigationPage,
  type AppRoute,
} from '@/lib/routes';
import { HomePage, DailyPage } from '@/features/marketplace/LandingPages';
import { MarketPage } from '@/features/marketplace/MarketPage';
import { SkillDetailPage } from '@/features/marketplace/MarketPages';
import { WorkshopPage } from '@/features/workshop/WorkshopPage';
import { InquiryStartPage } from '@/features/inquiry/InquiryStartPage';
import { outcomeTab } from '../shared/inquiry-workflow';
import { InquiryEditor } from '@/features/inquiry/InquiryEditor';
import { TaskPreview } from '@/features/space/TaskPreview';
import { useMarketWorkspace } from '@/hooks/useMarketWorkspace';
import { marketSkills } from '@/data/marketplace';
import { assistantSkillEntries, type SkillEntry } from '../shared/marketplace';
import type { ContextualDesign } from '../shared/contextual-design';
import { isMethodReviewed } from '../shared/method-review';
import { AccountProvider, useAccount } from '@/features/accounts/AccountProvider';
import { readPublishedSkills } from '@/lib/account-workspace';
import { useCompanions } from '@/features/companions/useCompanions';
import { CompanionsPage, CompanionDetail } from '@/features/companions/CompanionPages';
import { CompanionEditor } from '@/features/companions/CompanionEditor';
import { LegacyTaskCleanup } from '@/features/companions/LegacyTaskCleanup';
import { MountSkillDialog } from '@/features/companions/MountSkillDialog';
import { PublishSkillDialog } from '@/features/workshop/PublishSkillDialog';
import { newCompanion, type LearningCompanion } from '../shared/learning-companion';

export default function App() {
  return <AccountProvider><LegacyTaskCleanup><SkillWorkspace /></LegacyTaskCleanup></AccountProvider>;
}
function SkillWorkspace() {
  const { account, storage } = useAccount();
  const route = useAppRoute();
  const currentRouteHash = routeHash(route);
  usePageFocus(route);
  const platform = useDemoPlatform(storage, account.id);
  const market = useMarketWorkspace(storage);
  const companions = useCompanions(storage);
  const [publishing, setPublishing] = useState<SkillEntry | null>(null);
  const [mounting, setMounting] = useState<SkillEntry | null>(null);
  useEffect(() => {
    setPublishing(null);
    setMounting(null);
  }, [currentRouteHash]);
  const routeAssistantId = 'assistantId' in route ? route.assistantId : '';
  const designId = route.page === 'inquiry-editor' ? route.designId : '';
  const design = market.designs.find((d) => d.id === designId);
  const personalSkills = assistantSkillEntries(platform.assistants).map((entry) =>
    entry.assistantId && !platform.isSkillIncluded(entry.assistantId, entry.skill.id)
      ? { ...entry, validation: '待核对' as const } : entry);
  let publishedSkills: SkillEntry[] = [];
  let catalogError = '';
  try { publishedSkills = readPublishedSkills(localStorage, account.id); }
  catch { catalogError = '集市资料读取失败，请检查浏览器存储后重试。'; }
  const allSkills = [...personalSkills, ...marketSkills, ...publishedSkills, ...market.addedSkills];
  const addedIds = [...personalSkills.map((entry) => entry.id), ...market.addedSkills.map((entry) => entry.addedFrom!.id)];
  const visibleMarketSkills = [
    ...marketSkills,
    ...publishedSkills,
  ];
  const selectedSkill =
    route.page === 'skill-detail' ? allSkills.find((e) => e.id === route.skillId) : undefined;
  const task = route.page === 'task-preview' ? market.tasks.find((t) => t.id === route.taskId) : undefined;

  useEffect(() => {
    const withdrawn = personalSkills.filter((entry) => market.sharedSkillIds.includes(entry.id) &&
      platform.assistants.some((assistant) => assistant.id === entry.assistantId && (!isMethodReviewed(assistant) || !platform.isSkillIncluded(assistant.id, entry.skill.id))));
    if (withdrawn.length) market.removeShares(withdrawn.map((entry) => entry.id));
  }, [platform.assistants, market.sharedSkillIds]);

  useEffect(() => {
    if (route.page === 'create' && !platform.getAssistant(route.assistantId)) {
      platform.ensureAssistant(route.assistantId);
    }
  }, [route.page, routeAssistantId]);

  function navigate(next: AppRoute) {
    goTo(navigationRoute(readRoute(), next));
  }
  function back(fallback: AppRoute) {
    goTo(returnRoute(readRoute(), fallback));
  }
  function openMine(id: string) {
    const assistant = platform.getAssistant(id);
    if (!assistant) return;
    if (assistant.status === 'DRAFT') navigate({ page: 'create', assistantId: id });
    else if (!isMethodReviewed(assistant))
      navigate({ page: 'test', assistantId: id });
    else navigate({ page: 'trial-preview', assistantId: id, from: 'logs' });
  }
  function editSkill(entry: SkillEntry) {
    if (entry.assistantId)
      navigate({
        page: 'create',
        assistantId: entry.assistantId,
        skillId: entry.skill.id,
      });
  }
  function copySkill(entry: SkillEntry) {
    const copy = platform.copySkill(entry);
    if (copy) navigate({ page: 'create', ...copy });
  }
  function shareReviewedMethod(id: string, skillId?: string) {
    const assistant = platform.getAssistant(id);
    if (!assistant || !isMethodReviewed(assistant)) return;
    const entries = personalSkills.filter((entry) =>
      entry.assistantId === id && platform.isSkillIncluded(id, entry.skill.id) && (!skillId || entry.skill.id === skillId));
    if (entries.length && market.shareMany(entries.map((entry) => entry.id)))
      navigate({ page: 'market' });
  }
  function checkSkill(entry: SkillEntry) {
    const assistant = entry.assistantId ? platform.getAssistant(entry.assistantId) : undefined;
    if (!assistant) return;
    const included = platform.isSkillIncluded(assistant.id, entry.skill.id);
    if (!included && !platform.toggleSkill(assistant.id, entry.skill.id)) return;
    if ((!included || !isMethodReviewed(assistant)) && !platform.setStatus(assistant.id, 'GENERATED')) return;
    setPublishing(null);
    navigate({ page: 'test', assistantId: assistant.id });
  }
  function openCompanion(value: LearningCompanion) {
    setMounting(null);
    navigate({ page: 'companion-detail', companionId: value.id });
  }
  function organizeGuidance(source: ContextualDesign) {
    const id = crypto.randomUUID();
    platform.ensureAssistant(id);
    const idea = `在“${source.pblProject?.name || source.title}”项目中，我希望引导学生${source.pblProject?.goals || source.knowledgePoint}。我会在学生缺少证据或遇到困难时提问，保留学生自主决策空间。`;
    const saved = platform.updateAssistant(id, {
      area: 'inquiry',
      sourceDesignId: source.id,
      grade: source.grade,
      subject: source.subject,
      activity: '项目指导',
      goal: idea,
    });
    if (saved) navigate({ page: 'create', assistantId: id });
  }

  const publishedAssistants = platform.assistants.filter(
    (assistant) => assistant.isPublic && assistant.status === 'ACTIVE',
  );
  const publishedIds = new Set(publishedAssistants.map((assistant) => assistant.id));
  const publicLibrary = [
    ...publishedAssistants,
    ...libraryAssistants.filter((assistant) => !publishedIds.has(assistant.id)),
  ];
  const current = routeAssistantId ? platform.getAssistant(routeAssistantId) : undefined;
  const previewSkillId = route.page === 'trial-preview' && route.caseId
    ? route.caseId.slice(0, route.caseId.lastIndexOf(':')) : undefined;
  const missingPreviewCase = route.page === 'trial-preview' && current && route.caseId &&
    !methodPreviewCases(current.skills).some((item) => item.id === route.caseId);
  const missingEditingSkill = route.page === 'create' && current && route.skillId &&
    !current.skills.some((skill) => skill.id === route.skillId);
  const publicAssistant = routeAssistantId
    ? publicLibrary.find((item) => item.id === routeAssistantId)
    : undefined;
  const mySkills = [...personalSkills, ...market.addedSkills];
  const mountableSkill = selectedSkill && mySkills.find(entry =>
    entry.id === selectedSkill.id || entry.addedFrom?.id === selectedSkill.id);
  const selectedCompanion = 'companionId' in route ? companions.items.find(item => item.id === route.companionId) : undefined;

  return (
    <div className="application">
      <AppHeader
        route={route}
        onNavigate={navigate}
      />
      {(market.storageError || platform.storageError || companions.error || catalogError) && (
        <p className="storage-alert" role="alert">
          {market.storageError || platform.storageError || companions.error || catalogError}
        </p>
      )}
      {route.page === 'home' && <HomePage navigate={navigate} />}
      {route.page === 'daily' && <DailyPage navigate={navigate} />}
      {route.page === 'inquiry' && (
        <InquiryStartPage designs={market.designs} onCreate={market.addDesign} navigate={navigate} />
      )}
      {route.page === 'market' && (
        <MarketPage
          entries={visibleMarketSkills}
          favorites={market.favorites}
          addedIds={addedIds}
          onAdd={market.addSkill}
          onOpen={(skillId) => navigate({ page: 'skill-detail', skillId })}
          onFavorite={market.toggleFavorite}
        />
      )}
      {route.page === 'skill-detail' && selectedSkill && (
        <SkillDetailPage
          key={`skill-detail:${selectedSkill.id}`}
          entry={selectedSkill}
          favorite={market.favorites.includes(selectedSkill.id)}
          backLabel={returnLabel(route, { page: 'market' })}
          onBack={() => back({ page: 'market' })}
          onUse={() => { if (mountableSkill) setMounting(mountableSkill); }}
          onFavorite={() => market.toggleFavorite(selectedSkill.id)}
          onCopy={() => copySkill(selectedSkill)}
          onAdd={() => market.addSkill(selectedSkill)}
          added={Boolean(selectedSkill.addedFrom) || addedIds.includes(selectedSkill.id)}
          onEdit={selectedSkill.assistantId ? () => editSkill(selectedSkill) : undefined}
          canMount={Boolean(mountableSkill)}
          onCheck={selectedSkill.assistantId ? () => checkSkill(selectedSkill) : undefined}
          onPublish={selectedSkill.assistantId ? () => setPublishing(selectedSkill) : undefined}
          shared={market.sharedSkillIds.includes(selectedSkill.id)}
          showTrial={activeNavigationPage(route) === 'market'}
        />
      )}
      {route.page === 'skill-detail' && !selectedSkill && (
        <main className="page-frame not-found"><h1>没有找到这项 SKILL</h1>
          <button onClick={() => back({ page: 'market' })}>{returnLabel(route, { page: 'market' })}</button>
        </main>
      )}
      {route.page === 'inquiry-editor' && design && (
        <InquiryEditor
          key={`inquiry-editor:${design.id}`}
          design={design}
          level={route.level}
          preview={route.view === 'preview'}
          backLabel={returnLabel(route, { page: 'inquiry' })}
          onView={(preview) => navigate({ ...route, view: preview ? 'preview' : undefined })}
          onWorkshop={() => navigate({ page: 'workshop', tab: outcomeTab[route.level] })}
          onUse={() =>
            navigate({
              page: 'space',
              selection: `design:${design.id}:${route.level}`,
              returnTo: routeHash(route),
            })
          }
          onUpdate={(patch) => market.updateDesign(design.id, patch)}
          saveFailed={market.unsavedDesignIds.includes(design.id)}
          onRetrySave={market.retryDesignSave}
          onLevel={(level) => navigate({ page: 'inquiry-editor', designId: design.id, level })}
          onSave={() => market.saveDesign(design.id, route.level)}
          onBack={() => back({ page: 'inquiry' })}
          onCopy={() => {
            const id = market.copyDesign(design.id);
            if (id)
              navigate({
                page: 'inquiry-editor',
                designId: id,
                level: route.level,
              });
          }}
          onGuidance={() => organizeGuidance(design)}
        />
      )}
      {(route.page === 'workshop' || route.page === 'mine') && (
        <WorkshopPage
          catalogSkills={visibleMarketSkills}
          onAddSkill={market.addSkill}
          tab={route.page === 'mine' ? 'skills' : route.tab}
          onTab={(tab) => navigate({ page: 'workshop', tab })}
          skills={personalSkills}
          addedSkills={market.addedSkills}
          favorites={market.favorites}
          shared={market.sharedSkillIds}
          assistants={platform.assistants}
          onEditSkill={editSkill}
          onOpenSkill={(skillId) => navigate({ page: 'skill-detail', skillId })}
          onCopySkill={copySkill}
          onDeleteSkill={(e) => e.addedFrom ? market.removeAddedSkill(e.id) : Boolean(e.assistantId && platform.removeSkill(e.assistantId, e.skill.id))}
          onMount={setMounting}
          onFavorite={market.toggleFavorite}
          onShare={setPublishing}
          onCreate={() => navigate({ page: 'create', assistantId: crypto.randomUUID() })}
          onMarket={() => navigate({ page: 'market' })}
          onOpenAssistant={openMine}
          onDeleteAssistant={platform.removeAssistant}
        />
      )}
      {(route.page === 'companions' || route.page === 'space') && <CompanionsPage items={companions.items} skills={mySkills}
        onCreate={() => navigate({ page: 'companion-edit', companionId: crypto.randomUUID() })} onOpen={openCompanion}
        onEdit={value => navigate({ page: 'companion-edit', companionId: value.id })} onCopy={companions.copy} onRemove={companions.remove} />}
      {route.page === 'companion-edit' && <CompanionEditor key={`companion-editor:${route.companionId}`}
        initial={selectedCompanion || newCompanion(route.companionId, route.skillId)} skills={mySkills} onSave={companions.save}
        onBack={() => goTo({ page: 'companions' })} onSkills={() => navigate({ page: 'workshop' })}
        onDone={() => goTo({ page: 'companion-detail', companionId: route.companionId })} />}
      {route.page === 'companion-detail' && (selectedCompanion ? <CompanionDetail value={selectedCompanion} skills={mySkills}
        onBack={() => goTo({ page: 'companions' })} onEdit={() => navigate({ page: 'companion-edit', companionId: selectedCompanion.id })} /> :
        <main className="page-frame not-found"><h1>没有找到这个学伴</h1><button onClick={() => goTo({ page: 'companions' })}>返回我的学伴</button></main>)}
      {mounting && <MountSkillDialog key={`mount-skill:${mounting.id}`} entry={mounting} items={companions.items} onSave={companions.save}
        onClose={() => setMounting(null)} onOpen={(value) => {
          setMounting(null);
          navigate({ page: 'companion-detail', companionId: value.id });
        }} onCreate={() => {
          navigate({ page: 'companion-edit', companionId: crypto.randomUUID(), skillId: mounting.id }); setMounting(null);
        }} />}
      {publishing && <PublishSkillDialog key={`publish-skill:${publishing.id}`} entry={publishing} shared={market.sharedSkillIds.includes(publishing.id)}
        checked={Boolean(publishing.assistantId && platform.getAssistant(publishing.assistantId) && isMethodReviewed(platform.getAssistant(publishing.assistantId)!) && platform.isSkillIncluded(publishing.assistantId, publishing.skill.id))}
        onClose={() => setPublishing(null)} onCheck={() => checkSkill(publishing)}
        onPublish={() => {
          const assistant = publishing.assistantId ? platform.getAssistant(publishing.assistantId) : undefined;
          return Boolean(assistant && isMethodReviewed(assistant) && platform.isSkillIncluded(assistant.id, publishing.skill.id) && market.shareMany([publishing.id]));
        }}
        onWithdraw={() => market.removeShares([publishing.id])}
        onMarket={() => { setPublishing(null); navigate({ page: 'market' }); }} />}
      {route.page === 'task-preview' && task?.kind === 'skill' && <MethodTrialRecord task={task} onBack={() => back({ page: 'workshop', tab: 'skills' })} />}
      {route.page === 'task-preview' && task?.kind === 'design' && (
        <TaskPreview
          key={`task-preview:${task.id}`}
          task={task}
          onBack={() => back({ page: 'space' })}
          onSubmit={(s) => market.submitTask(task.id, s)}
        />
      )}
      {((route.page === 'task-preview' && !task) ||
        (route.page === 'inquiry-editor' && !design) || missingEditingSkill) && (
        <main className="page-frame not-found">
          <h1>没有找到这项内容</h1>
          <button onClick={() => navigate({ page: 'workshop' })}>返回我的 SKILL</button>
        </main>
      )}
      {route.page === 'library' && (
        <LibraryPage
          assistants={publicLibrary}
          onOpen={(id) => navigate({ page: 'library-detail', assistantId: id })}
        />
      )}
      {route.page === 'library-detail' && publicAssistant && (
        <LibraryDetailPage
          backLabel={returnLabel(route, { page: 'library' })}
          assistant={publicAssistant}
          onBack={() => back({ page: 'library' })}
          onUse={() => navigate({ page: 'use', assistantId: publicAssistant.id })}
        />
      )}
      {route.page === 'create' && current && !missingEditingSkill && (
        <DesignerPage
          key={`method-editor:${current.id}:${route.skillId || ''}`}
          assistant={current}
          storage={storage}
          selectedSkillId={route.skillId}
          sourceTags={market.designs.find((item) => item.id === current.sourceDesignId)?.tags}
          sourceCategory={market.designs.find((item) => item.id === current.sourceDesignId)?.category}
          onBack={() => back({ page: 'daily' })}
          onSaveExit={() =>
            navigate({
              page: 'workshop',
              tab: 'skills',
            })
          }
          onUpdate={(patch) => platform.updateAssistant(current.id, patch)}
          onStartTest={() => {
            if (route.skillId && !platform.isSkillIncluded(current.id, route.skillId) &&
              !platform.toggleSkill(current.id, route.skillId)) return false;
            if (!platform.setStatus(current.id, 'GENERATED')) return false;
            navigate({ page: 'test', assistantId: current.id });
            return true;
          }}
        />
      )}
      {route.page === 'test' && current && (
        <TestingPage
          onAdjust={() => {
            const parent = returnRoute(route, { page: 'create', assistantId: current.id });
            goTo(
              parent.page === 'create'
                ? parent
                : { page: 'create', assistantId: current.id, returnTo: route.returnTo },
            );
          }}
          key={`method-check:${current.id}:${current.updatedAt}`}
          assistant={{
            ...current,
            skills: current.skills.filter((skill) => platform.isSkillIncluded(current.id, skill.id)),
          }}
          onComplete={() => platform.setStatus(current.id, 'TESTED')}
          onSaveMethod={(skillId, method) => {
            if (!platform.saveReviewedMethod(current.id, skillId, method)) return false;
            market.removeShares(personalSkills.filter((entry) => entry.assistantId === current.id).map((entry) => entry.id));
            return true;
          }}
          onStartTrial={() => {
            if (platform.setStatus(current.id, 'TRIAL')) navigate({ page: 'trial-preview', assistantId: current.id, from: 'test' });
          }}
          onCreated={
            current.skills.some((skill) => skill.steps) ? () => navigate({ page: 'workshop' }) : undefined
          }
        />
      )}
      {route.page === 'logs' && current && (
        <LogsPage
          onBack={() => back({ page: 'workshop', tab: 'assistants' })}
          backLabel={returnLabel(route, { page: 'workshop', tab: 'assistants' })}
          assistant={current}
          onOpen={(sessionId) => navigate({ page: 'log-detail', assistantId: current.id, sessionId })}
          onReport={() => navigate({ page: 'report', assistantId: current.id })}
          onUse={() => navigate({ page: 'trial-preview', assistantId: current.id, from: 'logs' })}
        />
      )}
      {route.page === 'log-detail' && current && (
        <LogDetailPage
          assistant={current}
          sessionId={route.sessionId}
          onBack={() => back({ page: 'logs', assistantId: current.id })}
          onPreview={(index) => navigate({ page: 'trial-preview', assistantId: current.id, from: 'method', caseId: `${route.sessionId}:${index}` })}
        />
      )}
      {route.page === 'report' && current && (
        <ReportPage
          onEdit={() => navigate({ page: 'create', assistantId: current.id })}
          assistant={{ ...current, skills: current.skills.filter((skill) => platform.isSkillIncluded(current.id, skill.id)) }}
          onBack={() => goTo({ page: 'workshop', tab: 'skills' })}
          onCheck={() => navigate({ page: 'test', assistantId: current.id })}
          shared={personalSkills.filter((entry) => entry.assistantId === current.id && platform.isSkillIncluded(current.id, entry.skill.id)).every((entry) => market.sharedSkillIds.includes(entry.id))}
          onMarket={() => navigate({ page: 'market' })}
          onOpenPreview={() =>
            navigate({
              page: 'trial-preview',
              assistantId: current.id,
              from: 'report',
            })
          }
          onPublish={isMethodReviewed(current) ? () => shareReviewedMethod(current.id) : undefined}
        />
      )}
      {route.page === 'trial-preview' && current && !missingPreviewCase && (
        <StudentPreviewPage
          key={`student-preview:${current.id}:${route.caseId || ''}`}
          assistant={{ ...current, skills: current.skills.filter((skill) => previewSkillId ? skill.id === previewSkillId : platform.isSkillIncluded(current.id, skill.id)) }}
          onBack={() => back({ page: route.from === 'method' ? 'logs' : route.from, assistantId: current.id })}
          initialCaseId={route.caseId}
          checked={isMethodReviewed(current) && (!previewSkillId || platform.isSkillIncluded(current.id, previewSkillId))}
          backLabel={returnLabel(route, { page: route.from === 'method' ? 'logs' : route.from, assistantId: current.id })}
          onDone={() => goTo({ page: 'workshop', tab: 'skills' })}
          onShare={(skillId) => shareReviewedMethod(current.id, skillId)}
          sharedSkillIds={personalSkills.filter((entry) => entry.assistantId === current.id && market.sharedSkillIds.includes(entry.id)).map((entry) => entry.skill.id)}
          onContinue={() => {
            const entry = personalSkills.find(item => item.assistantId === current.id && (!previewSkillId || item.skill.id === previewSkillId));
            if (entry) checkSkill(entry);
          }}
        />
      )}
      {route.page === 'trial-preview' && current && missingPreviewCase &&
        <main className="page-frame not-found"><h1>没有找到这项方法</h1><button onClick={() => goTo({ page: 'workshop', tab: 'skills' })}>返回我的 SKILL</button></main>}
      {route.page === 'use' && (current || publicAssistant) && (
        <UsePage
          assistant={(current || publicAssistant)!}
          backLabel={returnLabel(
            route,
            current ? { page: 'logs', assistantId: current.id } : { page: 'workshop', tab: 'assistants' },
          )}
          onBack={() =>
            back(
              current ? { page: 'logs', assistantId: current.id } : { page: 'workshop', tab: 'assistants' },
            )
          }
        />
      )}
      {['library-detail', 'test', 'use', 'logs', 'log-detail', 'report', 'trial-preview'].includes(
        route.page,
      ) &&
        !(route.page === 'library-detail'
          ? publicAssistant
          : route.page === 'use'
            ? current || publicAssistant
            : current) && (
          <main className="not-found page-frame">
            <h1>没有找到这个助手</h1>
            <button onClick={() => navigate({ page: 'workshop' })}>返回我的 SKILL</button>
          </main>
        )}
    </div>
  );
}
