import { useState } from 'react'
import {
  ClipboardList, CheckCircle2, TrendingUp, TrendingDown, Target,
  ArrowUp, Sparkles,
} from 'lucide-react'
import { useCourses } from '../courseStore'
import './AdminAnalytics.css'

const DIVISIONS = ['All', 'PBD', 'LTS', 'AJD', 'Admin']
const GREEN = '#1b9a5a'

// Demo pre/post score bands derived from the course id (until real analytics).
const toModule = c => {
  const pre = 42 + (c.id * 7) % 26
  const post = Math.min(97, pre + 12 + (c.id * 5) % 22)
  return { id: c.id, code: c.code, session: c.session, division: c.division, title: c.shortTitle || c.title, pre, post }
}

const band = v => (v >= 80 ? 'an-good' : v >= 60 ? 'an-mid' : 'an-low')

function Sparkline({ values, color }) {
  const W = 120, H = 42
  const pts = values.map((v, i) => [(i / (values.length - 1)) * W, H - (v / 100) * H])
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L${W} ${H} L0 ${H} Z`
  const id = 'spk' + color.replace('#', '')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="sn-spark" preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3.5" fill={color} />
    </svg>
  )
}

function MiniBars({ values, color }) {
  const W = 120, H = 42, n = values.length, gap = W / n, bw = gap * 0.5
  const max = Math.max(...values, 1)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="sn-spark">
      {values.map((v, i) => {
        const h = Math.max(3, (v / max) * H * 0.92)
        return <rect key={i} x={i * gap + (gap - bw) / 2} y={H - h} width={bw} height={h} rx="2"
          fill={color} opacity={i === n - 1 ? 1 : 0.35} />
      })}
    </svg>
  )
}

function TickGauge({ value }) {
  const cx = 90, cy = 90, rIn = 60, rOut = 76, ticks = 40
  const start = 135, sweep = 270
  const active = Math.round((value / 100) * ticks)
  const lines = []
  for (let i = 0; i < ticks; i++) {
    const ang = ((start + (i / (ticks - 1)) * sweep) * Math.PI) / 180
    lines.push(
      <line key={i}
        x1={cx + rIn * Math.cos(ang)} y1={cy + rIn * Math.sin(ang)}
        x2={cx + rOut * Math.cos(ang)} y2={cy + rOut * Math.sin(ang)}
        stroke={i < active ? GREEN : '#e8eaf0'} strokeWidth="4" strokeLinecap="round" />
    )
  }
  return (
    <svg viewBox="0 0 180 180" className="an-gauge">
      {lines}
      <text x="90" y="88" textAnchor="middle" className="an-gauge-val">{value}%</text>
      <text x="90" y="108" textAnchor="middle" className="an-gauge-sub">Pass rate</text>
    </svg>
  )
}

function GroupedBars({ data }) {
  const W = 900, H = 280, pad = { l: 36, r: 18, t: 26, b: 42 }
  const cw = W - pad.l - pad.r, ch = H - pad.t - pad.b
  const groupW = cw / data.length, barW = Math.min(24, groupW / 3.4)
  const y = v => pad.t + ch - (v / 100) * ch
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="an-chart" role="img" aria-label="Pre versus post test averages">
      {[0, 25, 50, 75, 100].map(g => (
        <g key={g}>
          <line x1={pad.l} x2={W - pad.r} y1={y(g)} y2={y(g)} stroke="#eef0f5" strokeDasharray="3 4" />
          <text x={pad.l - 6} y={y(g) + 3} textAnchor="end" className="an-axis">{g}</text>
        </g>
      ))}
      {data.map((d, i) => {
        const gx = pad.l + i * groupW + groupW / 2
        return (
          <g key={d.id}>
            <rect x={gx - barW - 3} y={y(d.pre)} width={barW} height={pad.t + ch - y(d.pre)} rx="5" fill="#cdd3e0" />
            <rect x={gx + 3} y={y(d.post)} width={barW} height={pad.t + ch - y(d.post)} rx="5" fill={GREEN} className="an-post-bar" />
            <text x={gx - (barW / 2) - 3} y={y(d.pre) - 7} textAnchor="middle" className="an-bar-score an-bar-score-pre">{d.pre}%</text>
            <text x={gx + (barW / 2) + 3} y={y(d.post) - 7} textAnchor="middle" className="an-bar-score an-bar-score-post">{d.post}%</text>
            <text x={gx} y={H - pad.b + 17} textAnchor="middle" className="an-axis-x">
              {data.some(item => item.division !== data[0]?.division) ? `${d.division} S${d.session}` : `S${d.session}`}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export default function AdminAnalytics() {
  const [division, setDivision] = useState('All')
  const { courses } = useCourses()
  const data = courses
    .filter(c => division === 'All' || c.division === division)
    .map(toModule)
    .sort((a, b) => a.division.localeCompare(b.division) || a.session - b.session)
  const divisionLabel = division === 'All' ? 'All divisions' : `${division} division`

  const avgPre = Math.round(data.reduce((s, d) => s + d.pre, 0) / (data.length || 1))
  const avgPost = Math.round(data.reduce((s, d) => s + d.post, 0) / (data.length || 1))
  const improvement = avgPost - avgPre
  const passCount = data.filter(d => d.post >= 75).length
  const passRate = Math.round((passCount / (data.length || 1)) * 100)
  const signedImprovement = `${improvement >= 0 ? '+' : ''}${improvement}%`
  const performanceMessage = passRate >= 75 ? 'Strong performance' : passRate >= 50 ? 'Progress is building' : 'Opportunity to improve'

  const byPost = [...data].sort((a, b) => b.post - a.post)
  const fallback = { session: '—', title: 'No sessions', post: 0 }
  const strongest = byPost[0] || fallback, weakest = byPost[byPost.length - 1] || fallback

  return (
    <div className="an-page">
      <div className="an-topline">
        <div>
          <span className="an-eyebrow">Learning intelligence</span>
          <h1 className="an-h1">Analytics</h1>
          <p className="an-h1-sub">Where learners excel and where they need more support</p>
        </div>
        <div className="an-filter">
          <span className="an-filter-label">Division</span>
          <div className="an-tabs">
            {DIVISIONS.map(d => (
              <button key={d} className={`an-tab${division === d ? ' active' : ''}`} onClick={() => setDivision(d)}>{d}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Banner */}
      <div className="an-banner">
        <div className="an-banner-glow" />
        <div className="an-banner-text">
          <span className="an-banner-kicker">{divisionLabel} performance brief</span>
          <h2>{performanceMessage} <Sparkles size={18} /></h2>
          <p>Post-test scores average <b>{avgPost}%</b> — a <b>{signedImprovement}</b> change from the pre-test benchmark.</p>
          <div className="an-banner-meta">
            <span><b>{data.length}</b> sessions analyzed</span>
            <span><b>{passCount}</b> meeting the 75% pass mark</span>
          </div>
        </div>
        <svg className="an-banner-art" viewBox="0 0 200 130" aria-hidden="true">
          <path className="an-art-grid" d="M22 20H190M22 50H190M22 80H190M22 110H190M46 12V116M86 12V116M126 12V116M166 12V116" />
          <rect x="96" y="74" width="16" height="34" rx="4" fill="rgba(255,255,255,0.18)" />
          <rect x="120" y="58" width="16" height="50" rx="4" fill="rgba(255,255,255,0.3)" />
          <rect x="144" y="42" width="16" height="66" rx="4" fill="#22e07b" />
          <rect x="168" y="64" width="16" height="44" rx="4" fill="rgba(255,255,255,0.18)" />
          <path d="M96 70 L128 54 L152 40 L184 30" fill="none" stroke="#22e07b" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>

      {/* Stat tiles */}
      <div className="an-stats">
        <div className="an-card an-tile an-tile-green">
          <div className="an-tile-top">
            <div className="an-ic an-ic-green"><CheckCircle2 size={20} /></div>
            <span className="an-trend up"><ArrowUp size={12} /> +{improvement}%</span>
          </div>
          <p className="an-tile-value">{avgPost}%</p>
          <p className="an-tile-label">Avg. Post-Test</p>
          <div className="an-tile-chart an-glow"><Sparkline values={data.map(d => d.post)} color={GREEN} /></div>
        </div>

        <div className="an-card an-tile an-tile-indigo">
          <div className="an-tile-top">
            <div className="an-ic an-ic-indigo"><ClipboardList size={20} /></div>
            <span className="an-tile-context">Baseline</span>
          </div>
          <p className="an-tile-value">{avgPre}%</p>
          <p className="an-tile-label">Avg. Pre-Test</p>
          <div className="an-tile-chart"><Sparkline values={data.map(d => d.pre)} color="#8b93f8" /></div>
        </div>

        <div className="an-card an-tile an-tile-blue">
          <div className="an-tile-top">
            <div className="an-ic an-ic-blue"><TrendingUp size={20} /></div>
            <span className="an-tile-context">Learning gain</span>
          </div>
          <p className="an-tile-value">{signedImprovement}</p>
          <p className="an-tile-label">Avg. Improvement</p>
          <div className="an-tile-chart"><MiniBars values={data.map(d => d.post - d.pre)} color="#4d9bff" /></div>
        </div>

        <div className="an-card an-tile an-tile-amber">
          <div className="an-tile-top">
            <div className="an-ic an-ic-amber"><Target size={20} /></div>
            <span className="an-tile-context">Target: 75%</span>
          </div>
          <p className="an-tile-value">{passRate}%</p>
          <p className="an-tile-label">Pass Rate</p>
          <div className="an-progress"><div className="an-progress-bar" style={{ width: `${passRate}%` }} /></div>
          <p className="an-tile-foot">{passCount} of {data.length} sessions passing</p>
        </div>
      </div>

      {/* Chart + gauge */}
      <div className="an-row an-performance-row">
        <div className="an-card an-comparison-card">
          <div className="an-card-hd">
            <div>
              <h2 className="an-card-title">Assessment Score Comparison</h2>
              <p className="an-card-sub">Pre-test and post-test averages by session</p>
            </div>
            <div className="an-legend">
              <span><i className="an-dot an-dot-pre" /> Pre</span>
              <span><i className="an-dot an-dot-post" /> Post</span>
            </div>
          </div>
          <div className="an-card-body an-chart-body"><GroupedBars data={data} /></div>
        </div>

        <div className="an-card">
          <div className="an-card-hd">
            <div>
              <h2 className="an-card-title">Pass Benchmark</h2>
              <p className="an-card-sub">{divisionLabel} · 75% required score</p>
            </div>
          </div>
          <div className="an-card-body an-gauge-body">
            <div className="an-glow"><TickGauge value={passRate} /></div>
            <p className="an-gauge-caption">{signedImprovement} average improvement</p>
            <div className="an-gauge-breakdown">
              <div className="an-gb">
                <div className="an-ic an-ic-indigo sm"><ClipboardList size={15} /></div>
                <div><span className="an-gb-label">Pre-Test</span><span className="an-gb-val">{avgPre}%</span></div>
              </div>
              <div className="an-gb">
                <div className="an-ic an-ic-green sm"><CheckCircle2 size={15} /></div>
                <div><span className="an-gb-label">Post-Test</span><span className="an-gb-val">{avgPost}%</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mastery + insights */}
      <div className="an-row">
        <div className="an-card">
          <div className="an-card-hd">
            <div><h2 className="an-card-title">Session Mastery</h2><p className="an-card-sub">Post-test result against the 75% benchmark</p></div>
          </div>
          <div className="an-card-body">
            <div className="an-bars">
              {data.map(d => (
                <div key={d.id} className="an-bar-row">
                  <span className="an-bar-label">{division === 'All' ? `${d.division} · ` : ''}S{d.session} · {d.title}</span>
                  <div className="an-bar-track"><div className={`an-bar-fill ${band(d.post)}`} style={{ width: `${d.post}%` }} /></div>
                  <span className="an-bar-val">{d.post}%</span>
                </div>
              ))}
            </div>
            <div className="an-scale">
              <span><i className="an-dot an-good" /> Strong ≥80%</span>
              <span><i className="an-dot an-mid" /> Fair 60–79%</span>
              <span><i className="an-dot an-low" /> Weak &lt;60%</span>
            </div>
          </div>
        </div>

        <div className="an-card">
          <div className="an-card-hd">
            <div><h2 className="an-card-title">Key Insights</h2><p className="an-card-sub">Priority findings for this division</p></div>
          </div>
          <div className="an-card-body an-insights">
            <div className="an-insight">
              <div className="an-insight-icon good"><TrendingUp size={18} /></div>
              <div>
                <p className="an-insight-label">Strongest area</p>
                <p className="an-insight-title">S{strongest.session} · {strongest.title}</p>
                <p className="an-insight-val">{strongest.post}% post-test</p>
              </div>
            </div>
            <div className="an-insight">
              <div className="an-insight-icon bad"><TrendingDown size={18} /></div>
              <div>
                <p className="an-insight-label">Needs attention</p>
                <p className="an-insight-title">S{weakest.session} · {weakest.title}</p>
                <p className="an-insight-val">{weakest.post}% post-test</p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
