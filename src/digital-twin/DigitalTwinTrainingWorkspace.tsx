import { CURRENT_USER, isNewDemoUser, personalStorageKey } from "../role-center/demoAccount";
import { useFeedback } from "../role-center/feedback";
import {
  ArrowRight,
  Check,
  ChevronRight,
  CircleCheck,
  ClipboardList,
  Database,
  FileText,
  GraduationCap,
  MessageCircleQuestion,
  Pencil,
  Plug,
  Sparkles,
  Upload,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { A2AConversation } from "../assistant/a2aConversationTypes";
import "./digital-twin.css";
import "./profile-markdown.css";
import "./twin-configuration.css";
import TwinMemory from "./TwinMemory";
import TwinA2ASettings from "./TwinA2ASettings";
import TwinCapabilitySelection from "./TwinCapabilitySelection";
import TwinKnowledge from "./TwinKnowledge";
import { readTwinLibraries } from "./twinKnowledgeData";
import TwinAssessment from "./TwinAssessment";
import TwinGrowthCurve from "./TwinGrowthCurve";
import PersonalRoles from "../role-center/PersonalRoles";
import { PersonalLogs } from "../role-center/Governance";
import { actions, useRoleStore } from "../role-center/store";
import {
  Badge,
  Confirm,
  Dialog,
  Empty,
  Markdown,
} from "../role-center/ui";

type ProfileTab = "mind" | "goals";
type ResourceTab = "experts" | "skills" | "mcp" | "libraries";
type TaskStatus = "doing" | "confirm" | "done";
type Task = {
  id: string;
  conversationId: string;
  title: string;
  kind: string;
  status: TaskStatus;
  owner: string;
  people: string[];
  update: string;
  detail: string;
};
type Event = {
  id: string;
  date: string;
  time: string;
  type: string;
  title: string;
  summary: string;
  source: string;
  operator: string;
  detail: string;
};
const profileTabs: [ProfileTab, string, string][] = [
  ["mind", "工作画像", "让助理了解你的工作方式"],
  ["goals", "目标", "目标、口径与验收标准"],
];
const defaultProfileMarkdown: Record<ProfileTab, string> = {
  mind: "# 我的工作定位\n公司总经理，统筹公司经营与重点项目，关注目标达成、资源配置和重大风险。\n\n# 我经常处理的工作\n经营分析、重点项目推进、预算与回款跟踪、资源协调和重大风险研判。\n\n# 我关注的重点\n关注公司年度目标、重点项目交付、经营效益、现金回款与重大风险。\n\n# 我的沟通与表达偏好\n结论先行，突出关键数据、异常事项和需要决策的问题。\n\n# 我的判断习惯\n同时查看目标差距、原因、影响范围、责任人和下一步措施。\n\n# 我希望助理如何与我协作\n常规分析可先完成再向我汇报；资料不充分时先问我，对外发送或作出资源承诺前必须由我确认。",
  goals:
    "# 年度经营目标\n推进年度经营目标落实，关注经营效益、预算执行与现金回款。\n\n# 重点项目交付\n保障重点项目里程碑，及时识别延期风险和资源瓶颈。\n\n# 跨部门协同\n提高跨部门协同效率，明确责任人、协调事项和下一步措施。",

};
const resourceTabs: [ResourceTab, string][] = [
  ["experts", "专家"],
  ["skills", "技能"],
  ["mcp", "MCP"],
  ["libraries", "知识库"],
];
const demoGrowthEvent = (id: string, date: string, time: string, type: string, title: string, summary: string): Event => ({ id, date, time, type, title, summary, source: "数字分身配置", operator: "陈智超", detail: summary });
const events: Event[] = [
  demoGrowthEvent("ability-1", "2026-09-07", "11:15", "知识库", "启用知识库：我的项目经验", "将个人项目经验纳入分身检索范围。"),
  demoGrowthEvent("ability-2", "2026-09-09", "09:20", "技能", "配置经营简报生成", "分身可使用经营简报生成技能。"),
  demoGrowthEvent("ability-3", "2026-09-12", "10:43", "MCP", "配置项目管理平台", "分身可查询项目、任务进度与里程碑。"),
  demoGrowthEvent("ability-4", "2026-09-15", "16:08", "技能", "配置评审检查", "分身可按检查项核对完整性、依据和风险。"),
  demoGrowthEvent("ability-5", "2026-09-17", "09:35", "技能", "移除评审检查", "该技能不再配置给当前分身。"),
  demoGrowthEvent("ability-6", "2026-09-19", "09:34", "专家", "配置项目管理专家", "分身可使用项目管理专家协助梳理交付风险。"),
  demoGrowthEvent("ability-7", "2026-09-22", "15:21", "技能", "配置进度查询", "分身可跟踪里程碑与计划偏差。"),
  demoGrowthEvent("ability-8", "2026-09-25", "11:17", "MCP", "配置财务管理系统", "分身可查询授权的预算、成本和回款信息。"),
  demoGrowthEvent("ability-9", "2026-09-29", "17:06", "专家", "配置财务分析专家", "分身可使用财务分析专家辅助经营研判。"),
];
function taskFrom(c: A2AConversation): Task {
  const status: TaskStatus =
    c.status === "waiting_user_confirmation"
      ? "confirm"
      : c.status === "waiting_replies" || c.status === "response_received"
        ? "doing"
        : "done";
  const speaker =
    c.members[Math.min(c.repliedCount, Math.max(c.members.length - 1, 0))];
  return {
    id: `t-${c.id}`,
    conversationId: c.id,
    title: c.title,
    status,
    kind: `${c.scope === "group" ? "多人" : "单人"}${c.mechanism === "collaboration" ? "协作" : "通知"}`,
    owner:
      status === "doing" && speaker
        ? `${speaker.name}的数字分身`
        : `${c.hostName}的数字分身`,
    people: c.members.map((m) => `${m.name}的数字分身`),
    update: c.updatedAt,
    detail:
      c.pendingCurrentUserConfirmation?.question ??
      (c.goal ? `协作目标：${c.goal}。${c.preview}` : c.preview),
  };
}
const cols: [TaskStatus, string, string][] = [
  ["doing", "进行中", "等待分身回复或继续执行"],
  ["confirm", "待我确认", "需要你做出决定"],
  ["done", "已完成", "已送达或协作已结束"],
];

export function A2ATaskBoard({
  a2aConversations,
  onOpenA2AConversation,
}: {
  a2aConversations: A2AConversation[];
  onOpenA2AConversation: (id: string) => void;
}) {
  const [taskId, setTaskId] = useState<string | null>(null);
  const tasks = useMemo(() => a2aConversations.map(taskFrom), [a2aConversations]);
  const selectedTask = tasks.find((task) => task.id === taskId);

  return (
    <section className="a2a-task-board">
      <header className="a2a-task-board-heading">
        <div>
          <h1>A2A 任务</h1>
          <p>集中查看协作进度、待确认事项与已完成任务。</p>
        </div>
      </header>
      <div className="board a2a-task-board-grid">
        {cols.map(([id, title, desc]) => {
          const list = tasks.filter((task) => task.status === id);
          return (
            <section key={id}>
              <header>
                <div><i /><b>{title}</b><small>{desc}</small></div>
                <em>{list.length}</em>
              </header>
              <div>
                {list.length ? list.map((task) => (
                  <button className="task" key={task.id} onClick={() => setTaskId(task.id)}>
                    <span>{task.kind}</span>
                    <b>{task.title}</b>
                    <p>{task.detail}</p>
                    <div>
                      {task.people.map((person) => <i key={person}>{person.slice(0, 1)}</i>)}
                      <small>{task.people.join(" · ")}</small>
                    </div>
                    <footer><span>{task.owner}</span><time>{task.update}</time></footer>
                  </button>
                )) : <div className="rc"><Empty title={`暂无${title}任务`} /></div>}
              </div>
            </section>
          );
        })}
      </div>
      {selectedTask && (
        <Dialog
          title={selectedTask.title}
          onClose={() => setTaskId(null)}
          footer={<><button onClick={() => setTaskId(null)}>关闭</button><button className="rc-primary" onClick={() => { onOpenA2AConversation(selectedTask.conversationId); setTaskId(null); }}>进入对应会话</button></>}
        >
          <div className="rc-stack">
            <p>{selectedTask.detail}</p>
            <p>执行人：{selectedTask.owner}</p>
            <p>参与分身：{selectedTask.people.join("、")}</p>
          </div>
        </Dialog>
      )}
    </section>
  );
}
export default function DigitalTwinTrainingWorkspace() {
  const store = useRoleStore();
  const [profile, setProfile] = useState<ProfileTab | null>(null),
    [memoryOpen, setMemoryOpen] = useState(false),
    [resource, setResource] = useState<ResourceTab | null>(null),
    [identityOpen, setIdentityOpen] = useState(false),
    [event, setEvent] = useState<Event | null>(null);
  const user = store.people.find((p) => p.id === CURRENT_USER)!.name;
  const allEvents: Event[] = [
    ...store.growth
      .filter((e) => e.userId === CURRENT_USER && ["个人分身能力选择已更新。", "当前分身检索范围已更新。"].includes(e.detail))
      .reverse()
      .map((e) => ({
        id: e.id,
        date: e.at.slice(0, 10),
        time: e.at.slice(11, 19),
        type: e.type,
        title: e.title,
        summary: e.detail,
        source: "数字分身工作台",
        operator: user,
        detail: e.detail,
      })),
    ...(isNewDemoUser() ? [] : events),
  ];
  return (
    <div className="digital-twin-training">
      <header className="top">
        <div className="person">
          <i>{user.slice(0, 1)}</i>
          <div>
            
            <h1>{user}的数字分身</h1>
            <p>{isNewDemoUser() ? "岗位信息未提供" : "公司总经理"}</p>
          </div>
        </div>
        <div className="top-identity-actions">
          <button onClick={() => setIdentityOpen(true)}>身份信息</button>
          {!isNewDemoUser() && <span className="sync">
            <CircleCheck size={15} />
            身份已同步
          </span>}
        </div>
      </header>
      <main className="digital-twin-scroll">
        <div className="content">
          <div className="overview-stack">
            {isNewDemoUser() && localStorage.getItem(personalStorageKey("digital-twin-gm-work-profile-enabled")) !== "true" && <section className="twin-onboarding">
              <span>从这里开始</span><h2>让你的分身先了解你</h2>
              <p>先介绍你的工作方式，再按需要设置目标、添加能力和个人资料。</p>
              <button onClick={() => setProfile("mind")}>建立工作画像 <ArrowRight size={16} /></button>
            </section>}
            <section className="flat-section">
              <div className="heading">
                <div>
                  
                  <h2>用户心智</h2>
                </div>
              </div>
              <div className="flat-rail">
                {profileTabs.map(([id, label, description], i) => (
                  <button
                    className="flat-card"
                    key={id}
                    onClick={() => setProfile(id)}
                  >
                    <span>0{i + 1}</span>
                    <b>{label}</b>
                    <p>{description}</p>
                    <ChevronRight size={16} />
                  </button>
                ))}
                <button className="flat-card" onClick={() => setMemoryOpen(true)}><span>03</span><b>工作记忆</b><p>当前上下文与长期经验</p><ChevronRight size={16} /></button>
              </div>
            </section>
            <TwinA2ASettings />
            {!isNewDemoUser() && <PersonalRoles />}
            <section className="flat-section">
              <div className="heading">
                <div>
                  
                  <h2>能力</h2>
                </div>
              </div>
              <div className="flat-rail resource-rail">
                {resourceTabs.map(([id, label], i) => {
                  const Icon = [GraduationCap, Sparkles, Plug, Database][i];
                  const kind = i === 0 ? "expert" : i === 1 ? "skill" : "mcp";
                  const count = (store.personal[CURRENT_USER]?.ids || []).filter((id) => store.resources.some((r) => r.id === id && r.kind === kind)).length;
                  return (
                    <button
                      className="flat-card resource-card"
                      key={id}
                      onClick={() => setResource(id)}
                    >
                      <i>
                        <Icon size={20} />
                      </i>
                      <span>
                        {i === 3 ? "企业与个人" : `${count} 项已配置`}
                      </span>
                      <b>{label}</b>
                      <p>
                        {
                          [
                            "专业方向与协作专家",
                            "专项工作方法与技能",
                            "业务系统与工具连接",
                            "企业与个人资料",
                          ][i]
                        }
                      </p>
                      <ChevronRight size={16} />
                    </button>
                  );
                })}
              </div>
            </section>
            <TwinAssessment />
            <TwinGrowthCurve events={allEvents} currentCount={(store.personal[CURRENT_USER]?.ids || []).filter((id) => store.resources.some((item) => item.id === id && ["expert", "skill", "mcp"].includes(item.kind))).length + readTwinLibraries().filter((item) => item.enabled).length} onSelect={setEvent} />
            <section className="twin-overview-section"><div className="heading"><h2>对话日志</h2></div>{isNewDemoUser() && !store.runs.some(run => run.userId === CURRENT_USER) ? <Empty title="暂无对话记录">使用助理后，在这里查看你的记录。</Empty> : <PersonalLogs showPrepareTask={false} />}</section>
          </div>
        </div>
      </main>
      {identityOpen && (
        <Dialog title="身份信息" onClose={() => setIdentityOpen(false)}>
          <div className="rc-grid">
            {[
              ["姓名", user],

              ["岗位", isNewDemoUser() ? "岗位信息未提供" : "公司总经理"],



            ].map(([label, value]) => (
              <div key={label}>
                <small>{label}</small>
                <p>{value}</p>
              </div>
            ))}
          </div>
        </Dialog>
      )}
      {profile && (
        profile === "mind" ? (
          <WorkProfileDialog onClose={() => setProfile(null)} />
        ) : (
          <ProfileDialog
            key={profile}
            profile={profile}
            onClose={() => setProfile(null)}
          />
        )
      )}{" "}
      {memoryOpen && <TwinMemory onClose={() => setMemoryOpen(false)} />}
      {resource && (
        <Dialog
          title={resourceTabs.find((x) => x[0] === resource)?.[1] || "能力"}
          onClose={() => setResource(null)}
          wide
        >
          {resource === "libraries" ? (
            <TwinKnowledge />
          ) : (
            <TwinCapabilitySelection
              key={resource}
              kind={
                resource === "experts"
                  ? "expert"
                  : resource === "skills"
                    ? "skill"
                    : "mcp"
              }
            />
          )}
        </Dialog>
      )}
      {event && (
        <Dialog title={event.title} onClose={() => setEvent(null)}>
          <div className="rc-stack">
            <Badge>{event.type}</Badge>
            <p>{event.detail}</p>
            <small>{event.date} {event.time}</small>
          </div>
        </Dialog>
      )}
    </div>
  );
}

type WorkProfileAnswers = {
  scope: string;
  objects: string[];
  role: string;
  scenarios: string;
  priorities: string;
  communication: string;
  incompleteRequest: string;
  confirmationBoundary: string;
};

const executiveProfileDefaults: WorkProfileAnswers = {
  scope: "公司级",
  objects: ["项目", "数据", "流程／制度"],
  role: "公司总经理，统筹公司经营、重点项目与资源配置",
  scenarios: "经营分析、重点项目推进、预算与回款跟踪、跨部门协调",
  priorities: "公司年度目标、重点项目交付、经营效益、现金回款与重大风险",
  communication: "结论先行，突出关键数据、异常事项和需要决策的问题",
  incompleteRequest: "同时查看目标差距、原因、影响范围、责任人和下一步措施",
  confirmationBoundary: "常规分析可先完成再向我汇报；资料不充分时先问我，对外发送或作出资源承诺前必须由我确认",
};

const workScopeOptions = [
  ["公司级", "关注公司战略、经营目标、重大决策"],
  ["部门级", "关注部门目标、资源配置、团队协同"],
  ["项目级", "关注项目计划、进度、风险、交付"],
  ["模块级", "关注某个业务、系统、流程或专业模块"],
  ["任务级", "关注具体任务执行、问题处理和结果交付"],
  ["支持级", "为他人或组织提供专业支持、流程支持或服务保障"],
];
const workObjectOptions = ["人员", "项目", "任务", "产品", "技术／系统", "数据", "流程／制度"];
const workProfileSteps = [
  { title: "基础了解", detail: "回答两个选择题", icon: UserRound },
  { title: "深入交流", detail: "补充你的工作习惯", icon: MessageCircleQuestion },
  { title: "补充材料", detail: "可跳过", icon: Upload },
  { title: "生成画像", detail: "整理工作方式", icon: Sparkles },
] as const;

function readWorkProfile(): WorkProfileAnswers {
  const workProfileDefaults: WorkProfileAnswers = isNewDemoUser()
    ? { scope: "", objects: [], role: "", scenarios: "", priorities: "", communication: "", incompleteRequest: "", confirmationBoundary: "" }
    : executiveProfileDefaults;
  try {
    const saved = JSON.parse(localStorage.getItem(personalStorageKey("digital-twin-gm-work-profile-answers")) || "null");
    if (saved && typeof saved === "object") {
      const valid = { ...workProfileDefaults };
      for (const key of ["scope", "priorities", "communication", "incompleteRequest", "confirmationBoundary"] as const) {
        if (typeof saved[key] === "string") valid[key] = saved[key];
      }
      valid.objects = Array.isArray(saved.objects) ? saved.objects.filter((v: unknown) => typeof v === "string" && workObjectOptions.includes(v)).slice(0, 3) : [];
      return valid;
    }
    // Older demos stored only Markdown. Restore its actual content before updating.
    const markdown = localStorage.getItem(personalStorageKey("digital-twin-gm-profile-mind")) || "";
    const restored = { ...workProfileDefaults };
    const keys = ["role", "scenarios", "priorities", "communication", "incompleteRequest", "confirmationBoundary"] as const;
    workProfileSections(restored).forEach(([title], index) => {
      if (index < 2) return;
      const value = (markdown.split(`# ${title}\n`)[1] || (index === 5 ? markdown.split("# 助理需要向我确认的情况\n")[1] : ""))?.split(/\n#+ /)[0]?.trim();
      if (value) restored[keys[index]] = value;
    });
    return restored;
  } catch { return { ...workProfileDefaults }; }
}

const sampleMaterials = [
  { id: "review", name: "项目复盘摘要", detail: "用于了解问题分析和复盘习惯" },
  { id: "report", name: "汇报材料样例", detail: "用于了解表达结构和重点偏好" },
  { id: "work", name: "个人工作说明", detail: "用于补充职责范围和工作边界" },
];

function workProfileSections(answers: WorkProfileAnswers) {
  return [
    ["我的工作定位", answers.role],
    ["我经常处理的工作", answers.scenarios],
    ["我关注的重点", answers.priorities],
    ["我的沟通与表达偏好", answers.communication],
    ["我的判断习惯", answers.incompleteRequest],
    ["我希望助理如何与我协作", answers.confirmationBoundary],
  ];
}

function buildWorkProfileMarkdown(answers: WorkProfileAnswers) {
  return workProfileSections(answers)
    .map(([title, content]) => `# ${title}\n${content.trim()}`)
    .join("\n\n");
}

function WorkProfileDialog({ onClose }: { onClose: () => void }) {
  const profileKey = personalStorageKey("digital-twin-gm-profile-mind");
  const statusKey = personalStorageKey("digital-twin-gm-work-profile-enabled");
  const [answers, setAnswers] = useState(readWorkProfile);
  const [step, setStep] = useState(() => {
    try {
      return (isNewDemoUser() ? localStorage.getItem(statusKey) === "true" : localStorage.getItem(statusKey) !== "false") ? 4 : 0;
    } catch {
      return 0;
    }
  });
  const flow = useRef<HTMLDivElement>(null);
  useEffect(() => {
    flow.current?.closest(".rc-dialog-body")?.scrollTo({ top: 0 });
  }, [step]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const [editing, setEditing] = useState(false);
  const [manualEditing, setManualEditing] = useState(false);
  const [materials, setMaterials] = useState<string[]>(isNewDemoUser() ? [] : ["review", "report"]);
  const [generating, setGenerating] = useState(false);
  const [enabled, setEnabled] = useState(() => {
    try {
      return (isNewDemoUser() ? localStorage.getItem(statusKey) === "true" : localStorage.getItem(statusKey) !== "false");
    } catch {
      return false;
    }
  });
  const [notice, setNotice] = useState("");
  const sections = workProfileSections(answers);
  const markdown = buildWorkProfileMarkdown(answers);
  const update = (key: Exclude<keyof WorkProfileAnswers, "objects">, value: string) =>
    setAnswers((current) => ({ ...current, [key]: value }));
  const toggleMaterial = (id: string) =>
    setMaterials((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  const startAgain = () => {
    setEditing(true);
    setManualEditing(false);
    setNotice("");
    setStep(0);
  };
  const generate = () => {
    setStep(3);
    setGenerating(true);
    timer.current = window.setTimeout(() => {
      setGenerating(false);
      setStep(4);
    }, 700);
  };
  const activate = () => {
    const changed = localStorage.getItem(profileKey) !== markdown;
    localStorage.setItem(personalStorageKey("digital-twin-gm-work-profile-answers"), JSON.stringify(answers));
    localStorage.setItem(profileKey, markdown);
    localStorage.setItem(statusKey, "true");
    if (changed) actions.profileGrowth("更新工作画像");
    setEnabled(true);
    setEditing(false);
    setManualEditing(false);
    setNotice("工作画像已应用。助理会在回答、提醒和建议中参考这些内容。");
  };

  const applied = enabled && !editing && !manualEditing;
  const validBasics = !!answers.scope && answers.objects.length > 0;
  const continueBasics = () => {
    setStep(1);
  };
  const toggleObject = (value: string) => setAnswers((current) => ({ ...current, objects: current.objects.includes(value) ? current.objects.filter((v) => v !== value) : current.objects.length < 3 ? [...current.objects, value] : current.objects }));
  return (
    <Dialog
      title="工作画像"
      onClose={() => {
        if (step !== 4 || editing || manualEditing || !enabled) {
          if (!window.confirm("离开后，本次未确认的画像不会生效。确定离开吗？")) return;
        }
        onClose();
      }}
      wide
      footer={
        <>
          <button onClick={() => { if ((step !== 4 || editing || manualEditing || !enabled) && !window.confirm("放弃本次未确认的画像？")) return; onClose(); }}>{editing ? "取消更新" : "关闭"}</button>
          {step > 0 && step < 3 && (
            <button onClick={() => setStep((current) => Math.max(0, current - 1))}>上一步</button>
          )}
          {step === 0 && (
            <button className="rc-primary" disabled={!validBasics} onClick={continueBasics}>下一步</button>
          )}
          {step === 1 && (
            <button className="rc-primary" disabled={!answers.communication.trim() || !answers.incompleteRequest.trim() || !answers.confirmationBoundary.trim()} onClick={() => setStep(2)}>下一步</button>
          )}
          {step === 2 && <>
            <button onClick={() => { setMaterials([]); generate(); }}>跳过材料并生成</button>
            <button className="rc-primary" onClick={generate}>生成画像</button>
          </>}
          {step === 4 && manualEditing && <button onClick={() => { setAnswers(readWorkProfile()); setManualEditing(false); }}>取消编辑</button>}
          {step === 4 && !applied && <>
            {!manualEditing && <button onClick={() => setStep(0)}>返回修改</button>}
            <button className="rc-primary" onClick={activate}>{manualEditing ? "保存画像" : "确认使用"}</button>
          </>}
          {step === 4 && applied && <><button onClick={() => setManualEditing(true)}>编辑画像</button><button onClick={startAgain}>更新画像</button></>}
        </>
      }
    >
      <div className="work-profile-flow" ref={flow}>
        <section className="work-profile-intro">
          <div>
            <span>让助理更懂我</span>
            <h2>{step === 4 ? "我的工作画像" : editing ? "更新你的工作画像" : "建立你的工作画像"}</h2>
            <p>{manualEditing ? "前两项由 C 大脑同步，后四项可在这里直接调整。" : applied ? "助理会参考这份画像，理解你的工作重点、沟通偏好和判断习惯。" : editing ? "新画像确认使用后才会替换当前画像，取消更新不影响原有内容。" : "回答两个基础问题，再聊聊你的工作习惯，让助理更懂你。"}</p>
          </div>
          <em className={applied ? "is-enabled" : ""}>{manualEditing ? "编辑中" : applied ? "已应用" : step === 4 ? "待确认" : `第 ${step + 1} 步`}</em>
        </section>

        {step < 4 && <ol className="work-profile-steps" aria-label="工作画像生成步骤">
          {workProfileSteps.map(({ title, detail, icon: Icon }, index) => (
            <li className={`${index === step ? "active" : ""} ${index < step ? "done" : ""}`} key={title}>
              <i>{index < step ? <Check size={15} /> : <Icon size={15} />}</i>
              <div><b>{title}</b><small>{detail}</small></div>
            </li>
          ))}
        </ol>}

        {step === 0 && (
          <section className="work-profile-panel">
            <header><div><span>基础了解</span><h3>先了解你的工作范围</h3></div><small>共 2 题</small></header>
            <div className="work-profile-questionnaire">
              <fieldset><legend>1. 你的工作影响范围更接近哪一类？</legend><p>单选</p>
                <div className="work-profile-options">{workScopeOptions.map(([value, detail]) => <label key={value} className={answers.scope === value ? "selected" : ""}><input type="radio" name="work-scope" value={value} checked={answers.scope === value} onChange={() => update("scope", value)} /><span><strong>{value}</strong><small>{detail}</small></span></label>)}</div>
              </fieldset>
              <fieldset><legend>2. 你日常主要关注的对象是什么？</legend><p aria-live="polite">多选，最多选 3 个 · 已选 {answers.objects.length}/3{answers.objects.length === 3 ? "，可取消后重新选择" : ""}</p>
                <div className="work-profile-options work-profile-object-options">{workObjectOptions.map((value) => <label key={value} className={answers.objects.includes(value) ? "selected" : ""}><input type="checkbox" checked={answers.objects.includes(value)} disabled={answers.objects.length >= 3 && !answers.objects.includes(value)} onChange={() => toggleObject(value)} /><strong>{value}</strong></label>)}</div>
              </fieldset>
            </div>
          </section>
        )}

        {step === 1 && (
          <section className="work-profile-panel work-profile-interview">
            <header><div><span>深入交流</span><h3>助理根据你的回答继续了解</h3></div><small>演示问答，可修改回答</small></header>
            <article><i>AI</i><div><b>{["公司级", "部门级"].includes(answers.scope) ? `在${answers.scope}工作中，当目标与资源发生冲突时，你通常怎么判断优先级？` : `围绕${answers.objects.join("、")}开展工作时，信息不完整你通常会怎么推进？`}</b><p>这个回答会帮助助理理解你的判断顺序。</p></div></article>
            <textarea aria-label="我的判断习惯" value={answers.incompleteRequest} onChange={(e) => update("incompleteRequest", e.target.value)} />
            <article><i>AI</i><div><b>你希望助理怎样表达和汇报？</b><p>选择更符合你习惯的表达方式。</p></div></article>
            <div className="work-profile-fields"><label><span>沟通与表达偏好</span><select value={answers.communication} onChange={(e) => update("communication", e.target.value)}>{Array.from(new Set([answers.communication, "结论先行，突出关键数据、异常事项和需要决策的问题", "先完整说明背景，再给出判断", "简洁直接，只保留关键结论和行动项"])).map((value) => <option key={value} value={value} disabled={!value}>{value || "请选择沟通与表达偏好"}</option>)}</select></label></div>
            <article><i>AI</i><div><b>你希望助理如何与你协作？</b><p>例如资料不足时先问你，或先完成常规分析再给你看；平台强制确认规则仍然适用。</p></div></article>
            <textarea aria-label="我希望助理如何与我协作" value={answers.confirmationBoundary} onChange={(e) => update("confirmationBoundary", e.target.value)} />
          </section>
        )}

        {step === 2 && (
          <section className="work-profile-panel">
            <header><div><span>补充材料</span><h3>选择几份演示材料</h3></div><small>不会读取或上传真实文件</small></header>
            <div className="work-profile-materials">
              {sampleMaterials.map((item) => (
                <button className={materials.includes(item.id) ? "selected" : ""} onClick={() => toggleMaterial(item.id)} key={item.id}>
                  <FileText size={20} />
                  <span><b>{item.name}</b><small>{item.detail}</small></span>
                  <i>{materials.includes(item.id) && <Check size={14} />}</i>
                </button>
              ))}
            </div>
            <p className="work-profile-demo-note"><Upload size={16} />正式产品可在这里上传本人材料；本 Demo 仅通过预置材料演示流程。</p>
          </section>
        )}

        {step === 3 && (
          <section className="work-profile-panel work-profile-generate">
            <span><Sparkles size={24} /></span>
            <h3>{generating ? "正在整理你的工作方式" : "信息已经准备好"}</h3>
            <p>{generating ? "正在归纳工作重点、沟通偏好、判断习惯和协作期待。" : "已完成基础了解和模拟访谈，并选择了 " + materials.length + " 份演示材料。"}</p>
            <div><ClipboardList size={17} /><span>2 道基础题</span><MessageCircleQuestion size={17} /><span>3 项工作习惯</span><FileText size={17} /><span>{materials.length} 份材料</span></div>
          </section>
        )}

        {step === 4 && (
          <section className="work-profile-result">
            <header>
              <div><span><CircleCheck size={17} />{manualEditing ? "编辑当前工作画像" : applied ? "当前使用的工作画像" : "工作画像已生成"}</span><p>{manualEditing ? "保存后，这四项调整才会应用到助理。" : applied ? "工作方式有变化时，可以更新画像。" : "请检查以下内容，确认后应用到你的助理。"}</p></div>
            </header>
            {notice && <p className="work-profile-success"><CircleCheck size={16} />{notice}</p>}
            <div className="work-profile-result-grid">{sections.map(([title, content], index) => <article key={title}><span>{title}</span>{manualEditing && index >= 2 ? <textarea aria-label={`编辑${title}`} value={content} onChange={(e) => update((["priorities", "communication", "incompleteRequest", "confirmationBoundary"] as const)[index - 2], e.target.value)} /> : <p>{content || (index < 2 ? "等待 C 大脑同步" : "待补充")}</p>}</article>)}</div>
          </section>
        )}
      </div>
    </Dialog>
  );
}

function ProfileDialog({
  profile,
  onClose,
}: {
  profile: ProfileTab;
  onClose: () => void;
}) {
  const key = personalStorageKey(`digital-twin-gm-profile-${profile}`),
    title = profileTabs.find((t) => t[0] === profile)![1];
  const [content, setContent] = useState(() => {
      try {
        return localStorage.getItem(key) || (isNewDemoUser() ? "" : defaultProfileMarkdown[profile]);
      } catch {
        return (isNewDemoUser() ? "" : defaultProfileMarkdown[profile]);
      }
    }),
    [original, setOriginal] = useState(content),
    [editing, setEditing] = useState(false),
    [confirm, setConfirm] = useState(false);
  const { perform, feedback } = useFeedback();
  const dirty = content !== original;
  return (
    <>
      <Dialog
        title={title}
        onClose={() => (dirty ? setConfirm(true) : onClose())}
        wide
        footer={
          <>
            <button onClick={() => (dirty ? setConfirm(true) : onClose())}>
              关闭
            </button>
            {editing ? (
              <>
                <button
                  onClick={() => {
                    setContent(original);
                    setEditing(false);
                  }}
                >
                  取消编辑
                </button>
                <button
                  className="rc-primary"
                  onClick={() => {
                    if (
                      perform(() => {
                        if (!content.trim()) throw new Error("内容不能为空");
                        localStorage.setItem(key, content);
                        // 内容与保存前一致时不记成长点 —— 重复保存不是成长
                        if (content !== original) actions.profileGrowth(title);
                        setOriginal(content);
                        setEditing(false);
                      }, "目标已保存") !== false
                    )
                      setEditing(false);
                  }}
                >
                  保存
                </button>
              </>
            ) : (
              <button className="rc-primary" onClick={() => setEditing(true)}>
                <Pencil size={14} />
                编辑
              </button>
            )}
          </>
        }
      >
        {editing ? (
          <textarea
            className="rc-editor"
            aria-label={`编辑${title}`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        ) : (
          content.trim() ? <Markdown content={content} /> : <Empty title="尚未设置目标">写下你的工作目标、判断口径和验收标准，让助理了解你当前的重点。</Empty>
        )}
      </Dialog>
      {confirm && (
        <Confirm
          title="放弃未保存的修改"
          description="当前修改尚未保存，确认关闭后将恢复原内容。"
          onClose={() => setConfirm(false)}
          onConfirm={onClose}
        />
      )}{" "}
      {feedback}
    </>
  );
}
