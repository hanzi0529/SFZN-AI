import { useState } from "react";
import { ArrowUpRight } from "lucide-react";

type GrowthEvent = { id: string; date: string; time: string; type: string; title: string; summary: string; source: string; operator: string; detail: string };
type Period = "30" | "90" | "all";
const dayMs = (date: string) => new Date(`${date}T12:00:00`).getTime();
const dateAt = (time: number) => new Date(time).toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" });
function delta(event: GrowthEvent) {
  if (!["专家", "技能", "MCP", "知识库"].includes(event.type)) return 0;
  if (/^(移除|停用|取消)/.test(event.title)) return -1;
  if (/^(配置|新增|添加|启用)/.test(event.title)) return 1;
  return 0;
}

export default function TwinGrowthCurve({ events, currentCount, onSelect }: { events: GrowthEvent[]; currentCount: number; onSelect: (event: GrowthEvent) => void }) {
  const [period, setPeriod] = useState<Period>("90");
  const [focusedDate, setFocusedDate] = useState("");
  const today = dateAt(Date.now());
  const dated = events.filter((event) => event.date <= today && delta(event) !== 0).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const firstDay = period === "all" ? dated[0]?.date || today : dateAt(dayMs(today) - (Number(period) - 1) * 86400000);
  const dayCount = Math.max(1, Math.round((dayMs(today) - dayMs(firstDay)) / 86400000) + 1);
  const eventsByDay = new Map<string, GrowthEvent[]>();
  for (const event of dated) eventsByDay.set(event.date, [...(eventsByDay.get(event.date) || []), event]);
  const netChanges = dated.reduce((sum, event) => sum + delta(event), 0);
  const beforeRange = dated.filter((event) => event.date < firstDay).reduce((sum, event) => sum + delta(event), 0);
  let total = Math.max(0, currentCount - netChanges + beforeRange);
  const days = Array.from({ length: dayCount }, (_, index) => {
    const date = dateAt(dayMs(firstDay) + index * 86400000);
    const changes = eventsByDay.get(date) || [];
    total += changes.reduce((sum, event) => sum + delta(event), 0);
    return { date, count: total, changes };
  });
  const shown = dated.filter((event) => event.date >= firstDay);
  const width = Math.max(1040, days.length * 13.2);
  const min = Math.max(0, Math.min(...days.map((day) => day.count)) - 1);
  const max = Math.max(4, ...days.map((day) => day.count)) + 1;
  const x = (index: number) => 62 + index / Math.max(1, days.length - 1) * (width - 124);
  const y = (count: number) => 227 - (count - min) / Math.max(1, max - min) * 146;
  const line = days.map((day, index) => `${x(index)},${y(day.count)}`).join(" ");
  const dateStep = days.length <= 35 ? 5 : days.length <= 100 ? 7 : days.length <= 200 ? 14 : 30;
  const selectDay = (date: string, changes: GrowthEvent[]) => {
    setFocusedDate(date);
    const item = changes[0];
    if (item) document.getElementById(`growth-${item.id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  };

  return <section className="twin-overview-section"><div className="heading"><h2>成长曲线</h2></div><div className="growth-curve twin-growth">
    <header className="twin-growth-head"><div><h3>能力值</h3><p>专家、技能、MCP 和已启用知识库：增加一项 +1，移除一项 −1。</p></div><strong>{currentCount}<small>项能力</small></strong></header>
    <div className="twin-growth-period" aria-label="成长曲线时间范围">{([["30", "近 30 天"], ["90", "近 90 天"], ["all", "全部"]] as const).map(([value, label]) => <button key={value} className={period === value ? "active" : ""} onClick={() => { setPeriod(value); setFocusedDate(""); }}>{label}</button>)}</div>
    <div className="twin-growth-chart"><svg viewBox={`0 0 ${width} 285`} style={{ width }} role="img" aria-label={`${days.length} 天逐日能力值折线图`}>
      {[min, Math.round((min + max) / 2), max].map((value) => <g key={value}><text x="48" y={y(value) + 4} textAnchor="end" fill="#8297a8" fontSize="12">{value}</text><line x1="62" x2={width - 62} y1={y(value)} y2={y(value)} stroke="#eaf0f5" /></g>)}
      <line x1="62" x2={width - 62} y1="234" y2="234" stroke="#d8e4ed" />
      <polyline points={line} fill="none" stroke="#388cce" strokeWidth="3" strokeLinejoin="round" />
      {days.map((day, index) => <g key={day.date}>
        {(index % dateStep === 0 || index === days.length - 1) && <text x={x(index)} y="261" textAnchor="middle" fill="#8193a2" fontSize="11">{day.date.slice(5).replace("-", "/")}</text>}
        {day.changes.length > 0 && <g className="twin-growth-point" role="button" tabIndex={0} aria-label={`${day.date}，能力值 ${day.count}，${day.changes.map((item) => item.title).join("、")}`} onClick={() => selectDay(day.date, day.changes)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") selectDay(day.date, day.changes); }}>
          <circle cx={x(index)} cy={y(day.count)} r="16" fill="transparent" />
          <circle className="twin-growth-dot" cx={x(index)} cy={y(day.count)} r={focusedDate === day.date ? "5" : "3.5"} fill="#388cce" stroke="#fff" strokeWidth="1.5" />
          <title>{day.date} · {day.changes.map((item) => item.title).join("、")}</title>
        </g>}
      </g>)}
    </svg></div>
    <div className="growth-records-heading"><ArrowUpRight size={18} /><b>成长记录</b><small>仅记录能力增减；点击可查看具体内容</small></div>
    {shown.length ? <div className="growth-records" role="list">{shown.map((event) => <button id={`growth-${event.id}`} role="listitem" key={event.id} className={`growth-record capability ${focusedDate === event.date ? "selected" : ""}`} onClick={() => { setFocusedDate(event.date); onSelect(event); }}><time>{event.date.slice(5).replace("-", ".")}<small>{event.time}</small></time><i /><div><span>{delta(event) > 0 ? "+1 项能力" : "−1 项能力"}</span><b>{event.title}</b><p>{event.summary}</p></div></button>)}</div> : <p className="twin-growth-empty">所选时间范围内暂无能力变动。</p>}
  </div></section>;
}
