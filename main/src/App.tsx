import { useEffect } from 'react';
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
import { outcomeTab, isOutcomeReady } from '../shared/inquiry-workflow';
import { InquiryEditor } from '@/features/inquiry/InquiryEditor';
import { UsageSpace } from '@/features/space/UsageSpace';
import { TaskPreview } from '@/features/space/TaskPreview';
import { useMarketWorkspace } from '@/hooks/useMarketWorkspace';
import { marketSkills } from '@/data/marketplace';
import { assistantSkillEntries, type SkillEntry } from '../shared/marketplace';
import type { ContextualDesign } from '../shared/contextual-design';
import { isMethodReviewed } from '../shared/method-review';

export default function App() {
  const route = useAppRoute();
  usePageFocus(route);
  const platform = useDemoPlatform();
  const market = useMarketWorkspace();
  const routeAssistantId = 'assistantId' in route ? route.assistantId : '';
  const designId = route.page === 'inquiry-editor' ? route.designId : '';
  const design = market.designs.find((d) => d.id === designId);
  const personalSkills = assistantSkillEntries(platform.assistants).map((entry) =>
    entry.assistantId && !platform.isSkillIncluded(entry.assistantId, entry.skill.id)
      ? { ...entry, validation: '待核对' as const } : entry);
  const allSkills = [...personalSkills, ...marketSkills];
  const visibleMarketSkills = [
    ...marketSkills,
    ...personalSkills.filter((e) => market.sharedSkillIds.includes(e.id) &&
      platform.assistants.some((assistant) => assistant.id === e.assistantId && isMethodReviewed(assistant) && platform.isSkillIncluded(assistant.id, e.skill.id))),
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
  function useDesign(source: ContextualDesign, level: 1 | 2 | 3) {
    if (!isOutcomeReady(source, level)) {
      navigate({ page: 'inquiry-editor', designId: source.id, level });
      return;
    }
    navigate({
      page: 'space',
      selection: `design:${source.id}:${level}`,
      returnTo: routeHash(route),
    });
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
  function reuseSkill(entry: SkillEntry) {
    const copy = platform.reuseSkill(entry);
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
  function applySkill(entry: SkillEntry) {
    const source = returnRoute(route, { page: 'market' });
    const saved =
      source.page === 'space' ? market.activityDrafts.find((d) => d.id === source.draftId) : undefined;
    if (saved?.path === 'skill' && saved.skillId === entry.id) {
      goTo(source);
      return;
    }
    navigate({ page: 'space', selection: `skill:${entry.id}`, returnTo: routeHash(route) });
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
  const publicAssistant = routeAssistantId
    ? publicLibrary.find((item) => item.id === routeAssistantId)
    : undefined;
  const applicationDraftIds = market.activityDrafts
    .filter((draft) => draft.path === 'skill')
    .map((draft) => draft.id);
  const methodApplicationSource = route.page === 'skill-detail' &&
    returnRoute(route, { page: 'market' }).page === 'space' &&
    activeNavigationPage(route, applicationDraftIds) === 'workshop';

  return (
    <div className="application">
      <AppHeader
        route={route}
        onNavigate={navigate}
        applicationDraftIds={applicationDraftIds}
      />
      {(market.storageError || platform.storageError) && (
        <p className="storage-alert" role="alert">
          {market.storageError || platform.storageError}
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
          onOpen={(skillId) => navigate({ page: 'skill-detail', skillId })}
          onFavorite={market.toggleFavorite}
        />
      )}
      {route.page === 'skill-detail' && selectedSkill && (
        <SkillDetailPage
          key={selectedSkill.id}
          entry={selectedSkill}
          favorite={market.favorites.includes(selectedSkill.id)}
          backLabel={methodApplicationSource
            ? '返回 SKILL 配置' : returnLabel(route, { page: 'market' })}
          onBack={() => back({ page: 'market' })}
          onUse={() => applySkill(selectedSkill)}
          onFavorite={() => market.toggleFavorite(selectedSkill.id)}
          onReuse={() => reuseSkill(selectedSkill)}
          onEdit={selectedSkill.assistantId ? () => editSkill(selectedSkill) : undefined}
          applicationContext={returnRoute(route, { page: 'market' }).page === 'space'}
          onPreview={selectedSkill.assistantId ? (index) => {
            const assistant = platform.getAssistant(selectedSkill.assistantId!);
            if (!assistant) return;
            if (index === undefined && !platform.isSkillIncluded(assistant.id, selectedSkill.skill.id))
              editSkill(selectedSkill);
            else if (index === undefined && !isMethodReviewed(assistant))
              navigate({ page: 'test', assistantId: assistant.id });
            else navigate({ page: 'trial-preview', assistantId: assistant.id, from: 'method', caseId: `${selectedSkill.skill.id}:${index || 0}` });
          } : undefined}
        />
      )}
      {route.page === 'inquiry-editor' && design && (
        <InquiryEditor
          key={design.id}
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
          tab={route.page === 'mine' ? 'assistants' : route.tab}
          onTab={(tab) => navigate({ page: 'workshop', tab })}
          skills={personalSkills}
          allEntries={allSkills}
          designs={market.designs}
          favorites={market.favorites}
          shared={market.sharedSkillIds}
          assistants={platform.assistants}
          onUseSkill={(entry) =>
            navigate({
              page: 'space',
              selection: `skill:${entry.id}`,
              returnTo: routeHash(route),
            })
          }
          onUseDesign={useDesign}
          onEditSkill={editSkill}
          onOpenSkill={(skillId) => navigate({ page: 'skill-detail', skillId })}
          onCopySkill={reuseSkill}
          onDeleteSkill={(e) => Boolean(e.assistantId && platform.removeSkill(e.assistantId, e.skill.id))}
          onMount={platform.mountSkill}
          onFavorite={market.toggleFavorite}
          onShare={market.toggleShare}
          onOpenDesign={(designId, level) => navigate({ page: 'inquiry-editor', designId, level })}
          onPreviewDesign={(designId, level) =>
            navigate({ page: 'inquiry-editor', designId, level, view: 'preview' })
          }
          onCopyDesign={(sourceId, level) => {
            const id = market.copyDesign(sourceId);
            if (id)
              navigate({
                page: 'inquiry-editor',
                designId: id,
                level,
              });
          }}
          onDeleteDesign={market.removeDesign}
          onCreate={() => navigate({ page: 'create', assistantId: crypto.randomUUID() })}
          onInquiry={() => navigate({ page: 'inquiry' })}
          onMarket={() => navigate({ page: 'market' })}
          onOpenAssistant={openMine}
          onDeleteAssistant={platform.removeAssistant}
          methodTrials={market.tasks.filter((task) => task.kind === 'skill')}
          skillApplications={market.activityDrafts.filter((draft) => draft.path === 'skill')}
          onOpenMethodTrial={(taskId) => navigate({ page: 'task-preview', taskId })}
          onResumeApplication={(draftId) => navigate({ page: 'space', draftId })}
        />
      )}
      {route.page === 'space' && (
        <UsageSpace
          key={route.draftId || route.selection || 'teaching-activities'}
          initialSelection={route.selection}
          initialDraftId={route.draftId}
          backLabel={returnLabel(route, { page: 'home' })}
          onBack={() => back({ page: 'workshop', tab: 'skills' })}
          onWorkshop={() => navigate({ page: 'workshop' })}
          onDesign={(designId, level) => navigate({ page: 'inquiry-editor', designId, level })}
          skills={allSkills}
          ownedSkillIds={personalSkills.map((e) => e.id)}
          designs={market.designs}
          tasks={market.tasks}
          drafts={market.activityDrafts}
          onSaveDraft={market.saveActivityDraft}
          onPreview={(taskId, draftId) =>
            navigate({
              page: 'task-preview',
              taskId,
              returnTo: draftId ? routeHash({ page: 'space', draftId, returnTo: route.returnTo }) : undefined,
            })
          }
          onSkill={(skillId, draftId) =>
            navigate({
              page: 'skill-detail',
              skillId,
              returnTo: draftId ? routeHash({ page: 'space', draftId, returnTo: route.returnTo }) : undefined,
            })
          }
          onAdjust={(entry, draftId) =>
            entry.assistantId &&
            navigate({
              page: 'create',
              assistantId: entry.assistantId,
              skillId: entry.skill.id,
              returnTo: draftId ? routeHash({ page: 'space', draftId, returnTo: route.returnTo }) : undefined,
            })
          }
        />
      )}
      {route.page === 'task-preview' && task?.kind === 'skill' && <MethodTrialRecord task={task} onBack={() => back({ page: 'workshop', tab: 'skills' })} />}
      {route.page === 'task-preview' && task?.kind === 'design' && (
        <TaskPreview
          key={task.id}
          task={task}
          onBack={() => back({ page: 'space' })}
          onSubmit={(s) => market.submitTask(task.id, s)}
        />
      )}
      {((route.page === 'skill-detail' && !selectedSkill) ||
        (route.page === 'task-preview' && !task) ||
        (route.page === 'inquiry-editor' && !design)) && (
        <main className="page-frame not-found">
          <h1>没有找到这项内容</h1>
          <button onClick={() => navigate({ page: 'workshop' })}>返回我的作品</button>
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
      {route.page === 'create' && current && (
        <DesignerPage
          key={current.id + (route.skillId || '')}
          assistant={current}
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
          isSkillIncluded={(skillId) => platform.isSkillIncluded(current.id, skillId)}
          onToggleSkill={(skillId) => platform.toggleSkill(current.id, skillId)}
        />
      )}
      {route.page === 'test' && current && (
        <TestingPage
          backLabel={returnLabel(route, { page: 'create', assistantId: current.id })}
          onAdjust={() => {
            const parent = returnRoute(route, { page: 'create', assistantId: current.id });
            goTo(
              parent.page === 'create'
                ? parent
                : { page: 'create', assistantId: current.id, returnTo: route.returnTo },
            );
          }}
          key={current.id + current.updatedAt}
          assistant={{
            ...current,
            skills: current.skills.filter((skill) => platform.isSkillIncluded(current.id, skill.id)),
          }}
          onBack={() => back({ page: 'create', assistantId: current.id })}
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
      {route.page === 'trial-preview' && current && (!previewSkillId || current.skills.some((skill) => skill.id === previewSkillId)) && (
        <StudentPreviewPage
          key={current.id + (route.caseId || '')}
          assistant={{ ...current, skills: current.skills.filter((skill) => previewSkillId ? skill.id === previewSkillId : platform.isSkillIncluded(current.id, skill.id)) }}
          onBack={() => back({ page: route.from === 'method' ? 'logs' : route.from, assistantId: current.id })}
          initialCaseId={route.caseId}
          checked={isMethodReviewed(current) && (!previewSkillId || platform.isSkillIncluded(current.id, previewSkillId))}
          backLabel={returnLabel(route, { page: route.from === 'method' ? 'logs' : route.from, assistantId: current.id })}
          onDone={() => goTo({ page: 'workshop', tab: 'skills' })}
          onShare={(skillId) => shareReviewedMethod(current.id, skillId)}
          sharedSkillIds={personalSkills.filter((entry) => entry.assistantId === current.id && market.sharedSkillIds.includes(entry.id)).map((entry) => entry.skill.id)}
          onContinue={() => goTo({ page: previewSkillId && !platform.isSkillIncluded(current.id, previewSkillId) ? 'create' : 'test', assistantId: current.id,
            ...(previewSkillId ? { skillId: previewSkillId } : {}), returnTo: routeHash(route) })}
        />
      )}
      {route.page === 'trial-preview' && current && previewSkillId && !current.skills.some((skill) => skill.id === previewSkillId) &&
        <main className="page-frame not-found"><h1>没有找到这项方法</h1><button onClick={() => goTo({ page: 'workshop', tab: 'skills' })}>返回我的作品</button></main>}
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
            <button onClick={() => navigate({ page: 'workshop' })}>返回我的作品</button>
          </main>
        )}
    </div>
  );
}
