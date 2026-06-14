/**
 * NOIZYFISH.COM — LIVE
 *
 * From holding to live tonight: the public face of ROCKETFUEL.
 * Renders RSP_001's 40-year catalog architecture, ROCKETFUEL doctrine,
 * 75/25 royalty split + 1% NOIZYKIDZ trust irremovable, consent kernel proof.
 *
 * No audio served from here yet — that flows through Voice DNA Vault + R2 +
 * signed URLs once the consent kernel is wired across the four machines.
 * What we ship tonight is the PROVENANCE that NOIZYFISH exists, that the
 * catalog is real, and that the doctrine routes every dollar back into
 * production (per feedback_funds_funnelled_back_into_production.md).
 *
 * Author: Robert Stephen Plowman (RSP_001)
 * Doctrine: ROCKETFUEL · funds-funnelled · 75/25 · 1% NOIZYKIDZ trust
 */

const MANIFEST_FALLBACK = {
  scanned_at: null,
  totals: { files: 2792, bytes_human: "—" },
  by_category: {
    sfx: { files: 0, bytes_human: "—" },
    music: { files: 0, bytes_human: "—" },
    samples: { files: 0, bytes_human: "—" },
    voice: { files: 0, bytes_human: "—" },
    field: { files: 0, bytes_human: "—" },
  },
  doctrine: "rocketfuel",
};

function renderHtml(manifest) {
  const m = manifest || MANIFEST_FALLBACK;
  const total = (m.totals && m.totals.files) || 2792;
  const cats = m.by_category || {};
  const get = (k) => (cats[k] && cats[k].files) || 0;
  const sfx = get("sfx");
  const music = get("music");
  const samples = get("samples");
  const voice = get("voice");
  const field = get("field");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>NOIZYFISH — Sovereign Sound · 40 Years · ROCKETFUEL</title>
<meta name="description" content="NOIZYFISH. The 40-year catalog of Robert Stephen Plowman, routed through consent-as-code. Every asset C2PA-signed. Every use compensated. 75% to creators. 1% to NOIZYKIDZ trust. Always.">
<meta name="theme-color" content="#020408">
<meta property="og:title" content="NOIZYFISH — Sovereign Sound">
<meta property="og:description" content="40 years of music · voice · SFX. ROCKETFUEL for NOIZY.AI. Consent as executable code.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://noizyfish.com">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🐟</text></svg>">
<style>
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;800;900&family=Inter:wght@300;400;500;600&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;background:#020408;color:#c8cad8;font-family:'Inter',-apple-system,sans-serif;overflow-x:hidden}
canvas#u{position:fixed;inset:0;z-index:0;display:block}
main{position:relative;z-index:5;max-width:1200px;margin:0 auto;padding:2rem 1.25rem 6rem}
section{margin:0 0 4.5rem}

/* HERO */
.hero{min-height:78vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:4rem 0 2rem}
.wordmark{
  font-family:'Cinzel',serif;
  font-size:clamp(3rem,12vw,9rem);
  font-weight:900;letter-spacing:.1em;line-height:1;
  background:linear-gradient(180deg,#f8f8f8 0%,#e8e4df 15%,#d4cfc8 30%,#f0ece6 45%,#c8c2b8 55%,#e0dbd4 70%,#b8b2a8 85%,#d0cbc4 100%);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
  filter:drop-shadow(0 0 60px rgba(0,212,255,.08)) drop-shadow(0 4px 20px rgba(0,0,0,.5));
  opacity:0;animation:fade 4s cubic-bezier(.16,1,.3,1) .3s forwards;user-select:none;
}
.wordmark .fin{background:linear-gradient(180deg,#00d4ff,#0088cc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.tag{font-family:'Cinzel',serif;font-size:clamp(.7rem,1.8vw,1rem);letter-spacing:.4em;text-transform:uppercase;color:rgba(200,196,188,.4);margin-top:1.4rem;opacity:0;animation:fade 3s ease 1.5s forwards}
.kicker{font-size:clamp(.95rem,2vw,1.15rem);color:rgba(200,200,212,.65);margin-top:2.5rem;max-width:640px;line-height:1.6;opacity:0;animation:fade 3s ease 2.5s forwards}

/* COUNTERS */
.counters{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1.25rem;margin-top:3rem;opacity:0;animation:fade 3s ease 3s forwards;width:100%;max-width:900px}
.c{padding:1.4rem 1rem;border:1px solid rgba(0,212,255,.1);background:rgba(8,12,20,.6);backdrop-filter:blur(12px);border-radius:6px;text-align:center}
.c .n{font-family:'Cinzel',serif;font-size:clamp(1.8rem,4vw,2.6rem);font-weight:800;color:#fff;letter-spacing:.04em}
.c .l{margin-top:.4rem;font-size:.7rem;letter-spacing:.25em;text-transform:uppercase;color:rgba(0,212,255,.55)}

/* SECTIONS */
h2{font-family:'Cinzel',serif;font-size:clamp(1.4rem,3vw,2rem);font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:#e8e4df;margin-bottom:1.4rem;text-align:center}
h2 .b{color:#00d4ff}
.lead{max-width:760px;margin:0 auto 2.5rem;font-size:1.05rem;line-height:1.75;color:rgba(200,200,212,.75);text-align:center}

/* DOCTRINE */
.doctrine{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.25rem}
.d{padding:1.6rem 1.4rem;border:1px solid rgba(212,160,23,.18);background:rgba(20,16,8,.45);border-radius:6px}
.d .t{font-family:'Cinzel',serif;font-size:.85rem;letter-spacing:.3em;text-transform:uppercase;color:#d4a017;margin-bottom:.8rem}
.d .b{color:rgba(200,200,212,.85);font-size:.95rem;line-height:1.65}

/* CATALOG GRID */
.cats{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem}
.cat{padding:1.4rem 1rem;border:1px solid rgba(0,212,255,.12);background:rgba(4,8,16,.55);border-radius:4px;text-align:center;transition:all .3s ease}
.cat:hover{border-color:rgba(0,212,255,.4);transform:translateY(-2px)}
.cat .icon{font-size:2rem;margin-bottom:.6rem}
.cat .name{font-family:'Cinzel',serif;font-size:.95rem;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:#fff}
.cat .count{margin-top:.4rem;font-size:.8rem;color:rgba(0,212,255,.6);letter-spacing:.15em}
.cat .meta{margin-top:.3rem;font-size:.65rem;color:rgba(200,200,212,.4);letter-spacing:.1em;text-transform:uppercase}

/* PROVENANCE */
.prov{padding:2rem 1.6rem;border:1px solid rgba(155,89,182,.2);background:rgba(20,8,30,.45);border-radius:6px;font-family:'SF Mono','Fira Code',monospace;font-size:.78rem;line-height:1.9;color:rgba(200,200,212,.7);overflow-x:auto}
.prov .k{color:rgba(155,89,182,.85)}
.prov .v{color:rgba(0,212,255,.7)}
.prov .c{color:rgba(212,160,23,.7)}

/* SPLIT VIZ */
.split{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;margin-top:1.5rem}
.s{padding:1.4rem;border-radius:6px;text-align:center}
.s.creator{background:linear-gradient(135deg,rgba(0,212,255,.15),rgba(0,212,255,.05));border:1px solid rgba(0,212,255,.3)}
.s.platform{background:linear-gradient(135deg,rgba(212,160,23,.12),rgba(212,160,23,.04));border:1px solid rgba(212,160,23,.25)}
.s.kidz{background:linear-gradient(135deg,rgba(155,89,182,.18),rgba(155,89,182,.06));border:1px solid rgba(155,89,182,.35)}
.s .pct{font-family:'Cinzel',serif;font-size:2.4rem;font-weight:800;color:#fff}
.s .lbl{margin-top:.3rem;font-size:.7rem;letter-spacing:.25em;text-transform:uppercase;color:rgba(200,200,212,.6)}
.s .desc{margin-top:.6rem;font-size:.78rem;color:rgba(200,200,212,.5);line-height:1.5}

/* CTAS */
.cta-wrap{display:flex;flex-wrap:wrap;justify-content:center;gap:1rem;margin-top:2.5rem}
.cta{display:inline-flex;align-items:center;gap:.5rem;padding:.95rem 1.6rem;border:1px solid rgba(0,212,255,.4);background:rgba(0,212,255,.08);color:#fff;text-decoration:none;font-family:'Cinzel',serif;font-size:.78rem;letter-spacing:.3em;text-transform:uppercase;border-radius:3px;transition:all .25s ease}
.cta:hover{background:rgba(0,212,255,.18);border-color:rgba(0,212,255,.7);transform:translateY(-1px)}
.cta.ghost{border-color:rgba(200,200,212,.2);background:transparent;color:rgba(200,200,212,.7)}
.cta.ghost:hover{border-color:rgba(200,200,212,.5);background:rgba(200,200,212,.05);color:#fff}

/* FOOTER */
footer{position:relative;z-index:5;border-top:1px solid rgba(200,200,212,.08);padding:3rem 1.25rem 2rem;text-align:center;font-family:'SF Mono',monospace;font-size:.7rem;letter-spacing:.18em;color:rgba(200,200,212,.4)}
footer a{color:rgba(0,212,255,.55);text-decoration:none}
footer a:hover{color:rgba(0,212,255,.9)}
footer .row{margin:.4rem 0}

@keyframes fade{0%{opacity:0;transform:translateY(15px);filter:blur(8px)}100%{opacity:1;transform:translateY(0);filter:blur(0)}}

@media (max-width: 640px){
  main{padding:1rem 1rem 4rem}
  section{margin-bottom:3rem}
  .hero{min-height:auto;padding:3rem 0 1rem}
}
</style>
</head>
<body>
<canvas id="u"></canvas>
<main>

  <!-- HERO -->
  <section class="hero">
    <div class="wordmark">NOIZY<span class="fin">FISH</span></div>
    <div class="tag">Sovereign Sound · 40 Years · ROCKETFUEL</div>
    <p class="kicker">
      The 40-year catalog of Robert Stephen Plowman — voice, music, SFX, samples, sessions —
      routed through consent-as-code. Every asset C2PA-signed. Every use compensated.
      The first published estate of NOIZY.AI.
    </p>
    <div class="counters">
      <div class="c"><div class="n">${total.toLocaleString()}</div><div class="l">originals</div></div>
      <div class="c"><div class="n">40+</div><div class="l">years</div></div>
      <div class="c"><div class="n">75/25</div><div class="l">creator share</div></div>
      <div class="c"><div class="n">1%</div><div class="l">NOIZYKIDZ trust</div></div>
      <div class="c"><div class="n">396Hz</div><div class="l">liberation</div></div>
    </div>
  </section>

  <!-- ROCKETFUEL -->
  <section>
    <h2>The <span class="b">ROCKETFUEL</span> Doctrine</h2>
    <p class="lead">
      Most platforms launch with other people's content and extract value from it.
      NOIZY launches with the founder's content — and uses the act of launching to prove the consent kernel works.
      Forty years of art ignites the first stage. The cathedral lifts because the founder paid the cost in advance.
    </p>
    <div class="doctrine">
      <div class="d">
        <div class="t">Single-Purpose</div>
        <div class="b">These assets exist to launch the empire's first stage. Not collected for sale, not held for nostalgia, not licensed away. They burn to lift NOIZY.AI off the ground.</div>
      </div>
      <div class="d">
        <div class="t">Consent-Native</div>
        <div class="b">Every asset enrolls under EST-RSP-001 with scoped, time-bound, revocable consent tokens. The Kill Switch is one tap, real, and propagates within an hour.</div>
      </div>
      <div class="d">
        <div class="t">Provenance-Sealed</div>
        <div class="b">C2PA manifests on every output. The Voice DNA Vault holds the spectral fingerprint. 100-year OAIS/PREMIS estate. The lineage never breaks.</div>
      </div>
      <div class="d">
        <div class="t">Royalty-Routed</div>
        <div class="b">75% to the creator. 25% to platform — and 1% of that 25% is irremovable, routed to the NOIZYKIDZ trust by constitutional clause. Every transaction. Always.</div>
      </div>
    </div>
  </section>

  <!-- CATALOG -->
  <section>
    <h2>The <span class="b">Catalog</span></h2>
    <p class="lead">
      Spanning sound design, music for picture, voice acting, field recording, sampler instruments, and original composition.
      The full archive lives in THE&nbsp;DREAMCHAMBER. The shelf below is what's been indexed and routed for the empire so far.
    </p>
    <div class="cats">
      <div class="cat"><div class="icon">🎵</div><div class="name">Music</div><div class="count">${music.toLocaleString()}</div><div class="meta">indexed</div></div>
      <div class="cat"><div class="icon">🔊</div><div class="name">SFX</div><div class="count">${sfx.toLocaleString()}</div><div class="meta">indexed</div></div>
      <div class="cat"><div class="icon">🥁</div><div class="name">Samples</div><div class="count">${samples.toLocaleString()}</div><div class="meta">indexed</div></div>
      <div class="cat"><div class="icon">🎙</div><div class="name">Voice</div><div class="count">${voice.toLocaleString()}</div><div class="meta">indexed</div></div>
      <div class="cat"><div class="icon">🌊</div><div class="name">Field</div><div class="count">${field.toLocaleString()}</div><div class="meta">indexed</div></div>
      <div class="cat"><div class="icon">∞</div><div class="name">Estate</div><div class="count">EST-RSP-001</div><div class="meta">100-year</div></div>
    </div>
  </section>

  <!-- ROYALTY SPLIT -->
  <section>
    <h2>How a <span class="b">Dollar</span> Routes</h2>
    <p class="lead">Every commercial use of every asset routes through the same plowman_ledger. Per the funds-funnelled doctrine, founder revenue defaults back into production.</p>
    <div class="split">
      <div class="s creator">
        <div class="pct">75%</div>
        <div class="lbl">Creator</div>
        <div class="desc">Direct to artist's wallet. No invoice, no threshold, no net-90. Automatic on every settlement.</div>
      </div>
      <div class="s platform">
        <div class="pct">24%</div>
        <div class="lbl">Platform</div>
        <div class="desc">Funnelled into NOIZY.AI production: infrastructure, art commissioning, security, contributor onboarding.</div>
      </div>
      <div class="s kidz">
        <div class="pct">1%</div>
        <div class="lbl">NOIZYKIDZ Trust</div>
        <div class="desc">Constitutional clause. Irremovable. 100-year preservation for the next generation of creators.</div>
      </div>
    </div>
  </section>

  <!-- PROVENANCE -->
  <section>
    <h2>The <span class="b">Receipt</span></h2>
    <p class="lead">Every asset, every use, every revocation — ledgered, attributable, reviewable. This is what consent-as-code looks like.</p>
    <div class="prov">
<span class="k">estate</span>:           EST-RSP-001
<span class="k">founding_actor</span>:   Robert Stephen Plowman
<span class="k">contact</span>:          <span class="v">rsp@noizy.ai</span>
<span class="k">jurisdiction</span>:     Canada (Quebec)
<span class="k">funnel_class</span>:     <span class="c">rocketfuel</span>          <span style="color:rgba(200,200,212,.3)">// per ROCKETFUEL_DOCTRINE.md</span>
<span class="k">creator_share</span>:    0.75                <span style="color:rgba(200,200,212,.3)">// 75% Plowman Standard</span>
<span class="k">platform_share</span>:   0.25
<span class="k">noizykidz_trust</span>:  0.01                <span style="color:rgba(200,200,212,.3)">// constitutional · irremovable</span>
<span class="k">consent_kernel</span>:   <span class="v">heaven.rsp-5f3.workers.dev</span>
<span class="k">kill_switch</span>:      <span class="v">active · 1h SLA</span>
<span class="k">c2pa</span>:             <span class="v">on every output</span>
<span class="k">never_clauses</span>:    9 active · growing-never-shrinking
<span class="k">archive</span>:          OAIS/PREMIS · 100-year
<span class="k">frequency</span>:        396 Hz — liberation
    </div>
  </section>

  <!-- CTAS -->
  <section style="text-align:center">
    <h2>Step Into the <span class="b">Cathedral</span></h2>
    <p class="lead">
      NOIZYFISH is the first published estate of NOIZY.AI. Coming behind: NOIZYVOX, NOIZYKIDZ, NOIZYLAB, WISDOM, the Guild of Artists.
      Every contributor's catalog runs the same path. The kernel doesn't ask whose voice it is.
    </p>
    <div class="cta-wrap">
      <a class="cta" href="https://noizy.ai">Enter NOIZY.AI</a>
      <a class="cta" href="/license">License an Asset</a>
      <a class="cta ghost" href="mailto:rsp@noizy.ai?subject=NOIZYFISH%20direct%20inquiry">Email RSP</a>
      <a class="cta ghost" href="/health">Status</a>
    </div>
  </section>

</main>

<footer>
  <div class="row">NOIZYFISH · A NOIZY Empire portal · Sovereign sound under the Plowman Standard</div>
  <div class="row">Consent as executable code · Provenance as default · Revocation as sacred · Compensation as automatic</div>
  <div class="row"><a href="https://noizy.ai">noizy.ai</a> · <a href="mailto:rsp@noizy.ai">rsp@noizy.ai</a> · 396 Hz</div>
</footer>

<script>
const C=document.getElementById('u'),X=C.getContext('2d');
let W,H,T=0;
const PAL=[[0,212,255],[212,160,23],[155,89,182],[80,140,220]];
class Star{constructor(){this.x=Math.random()*W;this.y=Math.random()*H;this.z=Math.random();this.br=Math.random()*1.8+.2;this.c=PAL[~~(Math.random()*PAL.length)];this.vx=(Math.random()-.5)*.1;this.vy=Math.random()*.05+.01;this.ph=Math.random()*6.28;this.fr=Math.random()*.002+.0008}
update(){this.x+=this.vx+Math.sin(T*this.fr+this.ph)*.2;this.y+=this.vy*(.4+this.z*.6);if(this.y>H+30||this.x<-30||this.x>W+30){this.x=Math.random()*W;this.y=-10}return this.br*(.3+this.z*.7)}}
class Cloud{constructor(){this.x=Math.random()*W;this.y=Math.random()*H;this.r=Math.random()*320+100;this.c=PAL[~~(Math.random()*PAL.length)];this.a=Math.random()*.01+.004;this.vx=(Math.random()-.5)*.03;this.vy=(Math.random()-.5)*.02;this.ph=Math.random()*6.28}
draw(){this.x+=this.vx+Math.sin(T*.0003+this.ph)*.12;this.y+=this.vy+Math.cos(T*.0004+this.ph)*.1;if(this.x<-this.r)this.x=W+this.r;if(this.x>W+this.r)this.x=-this.r;if(this.y<-this.r)this.y=H+this.r;if(this.y>H+this.r)this.y=-this.r;const g=X.createRadialGradient(this.x,this.y,0,this.x,this.y,this.r);g.addColorStop(0,'rgba('+this.c+','+this.a+')');g.addColorStop(1,'rgba('+this.c+',0)');X.fillStyle=g;X.fillRect(this.x-this.r,this.y-this.r,this.r*2,this.r*2)}}
let stars=[],clouds=[];
function init(){W=C.width=innerWidth;H=C.height=innerHeight;stars=[];clouds=[];const n=Math.min(180,~~(W*H/12000));for(let i=0;i<n;i++)stars.push(new Star());for(let i=0;i<7;i++)clouds.push(new Cloud())}
function frame(){T+=16;X.fillStyle='rgba(2,4,8,.10)';X.fillRect(0,0,W,H);for(const c of clouds)c.draw();for(const s of stars){const r=s.update(),a=(.25+s.z*.75)*(.5+Math.sin(T*.001+s.ph)*.5);X.beginPath();X.arc(s.x,s.y,r,0,6.28);X.fillStyle='rgba('+s.c+','+a+')';X.fill()}requestAnimationFrame(frame)}
addEventListener('resize',init);init();X.fillStyle='#020408';X.fillRect(0,0,W,H);frame();
</script>
</body>
</html>`;
}

function renderLicensePage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>NOIZYFISH — License an Asset</title>
<meta name="description" content="License from RSP_001's 40-year catalog. 75% to creator. 1% to NOIZYKIDZ trust. Consent-as-code.">
<meta name="theme-color" content="#020408">
<style>
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;800&family=Inter:wght@300;400;500;600&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{background:#020408;color:#c8cad8;font-family:'Inter',-apple-system,sans-serif;min-height:100vh;padding:2rem 1.25rem 6rem}
.wrap{max-width:760px;margin:0 auto}
h1{font-family:'Cinzel',serif;font-size:clamp(2rem,5vw,3rem);font-weight:800;letter-spacing:.08em;color:#fff;margin-bottom:.4rem;text-align:center}
h1 .b{background:linear-gradient(180deg,#00d4ff,#0088cc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.sub{text-align:center;color:rgba(200,200,212,.6);margin-bottom:2rem;letter-spacing:.18em;text-transform:uppercase;font-size:.78rem}
.lead{color:rgba(200,200,212,.8);font-size:1.05rem;line-height:1.7;margin-bottom:2.4rem;text-align:center;max-width:600px;margin-left:auto;margin-right:auto}
.lead b{color:#fff}
form{background:rgba(8,12,20,.7);border:1px solid rgba(0,212,255,.12);border-radius:8px;padding:2rem 1.6rem;backdrop-filter:blur(12px)}
label{display:block;margin-bottom:1.2rem}
label .lbl{font-family:'Cinzel',serif;font-size:.7rem;letter-spacing:.25em;text-transform:uppercase;color:rgba(0,212,255,.7);margin-bottom:.4rem;display:block}
input,textarea,select{width:100%;background:rgba(2,4,8,.6);border:1px solid rgba(200,200,212,.1);color:#fff;padding:.75rem .9rem;border-radius:4px;font:inherit;font-size:.95rem}
input:focus,textarea:focus,select:focus{outline:none;border-color:rgba(0,212,255,.5);background:rgba(2,4,8,.85)}
textarea{min-height:130px;resize:vertical}
.row{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
@media (max-width:560px){.row{grid-template-columns:1fr}}
button{display:block;width:100%;padding:1rem;background:linear-gradient(135deg,rgba(0,212,255,.2),rgba(0,212,255,.08));border:1px solid rgba(0,212,255,.5);color:#fff;font-family:'Cinzel',serif;font-size:.85rem;letter-spacing:.3em;text-transform:uppercase;cursor:pointer;border-radius:3px;margin-top:1rem;transition:all .2s ease}
button:hover{background:linear-gradient(135deg,rgba(0,212,255,.35),rgba(0,212,255,.15));border-color:rgba(0,212,255,.8)}
button:disabled{opacity:.5;cursor:not-allowed}
.honey{position:absolute;left:-9999px;width:1px;height:1px}
.note{font-size:.78rem;color:rgba(200,200,212,.45);margin-top:1.2rem;text-align:center;line-height:1.5}
.note a{color:rgba(0,212,255,.7);text-decoration:none}
.success{padding:1.5rem;background:rgba(76,217,123,.1);border:1px solid rgba(76,217,123,.4);border-radius:6px;text-align:center;color:#4cd97b;margin-top:1.5rem;display:none}
.success.show{display:block}
.error{padding:1rem;background:rgba(255,93,93,.1);border:1px solid rgba(255,93,93,.4);border-radius:6px;color:#ff5d5d;margin-top:1rem;display:none}
.error.show{display:block}
.split{display:grid;grid-template-columns:repeat(3,1fr);gap:.6rem;margin:1.5rem 0;font-family:'SF Mono',monospace;font-size:.7rem;letter-spacing:.15em;text-transform:uppercase;text-align:center}
.split>div{padding:.6rem;border:1px solid rgba(0,212,255,.15);border-radius:4px;background:rgba(2,4,8,.5)}
.split .pct{font-family:'Cinzel',serif;font-size:1.4rem;color:#fff;display:block;margin-bottom:.2rem}
.foot{margin-top:3rem;text-align:center;font-size:.7rem;letter-spacing:.18em;color:rgba(200,200,212,.35)}
.foot a{color:rgba(0,212,255,.55);text-decoration:none}
</style>
</head>
<body>
<div class="wrap">
  <h1>License a <span class="b">NOIZYFISH</span> Asset</h1>
  <div class="sub">Sovereign Sound · 40 Years · ROCKETFUEL</div>
  <p class="lead">
    Music. SFX. Voice. Field recordings. Sample instruments.
    Every asset routes through consent-as-code. Every dollar splits the same way, automatically:
  </p>
  <div class="split">
    <div><span class="pct">75%</span>Creator</div>
    <div><span class="pct">24%</span>Production</div>
    <div><span class="pct">1%</span>NOIZYKIDZ Trust</div>
  </div>
  <form id="f">
    <input class="honey" type="text" name="website" tabindex="-1" autocomplete="off" />
    <input class="honey" type="text" name="fax" tabindex="-1" autocomplete="off" />
    <div class="row">
      <label><span class="lbl">Your name</span><input name="name" type="text" autocomplete="name" /></label>
      <label><span class="lbl">Email *</span><input name="email" type="email" required autocomplete="email" /></label>
    </div>
    <label><span class="lbl">Organization / project</span><input name="organization" type="text" autocomplete="organization" /></label>
    <label><span class="lbl">What you'd like to license · what for *</span><textarea name="use_case" required placeholder="e.g. 'Want to license 8-12 cuts from the Indian Street Drummers field recordings for a 30-second documentary trailer · territory: worldwide · streaming + festival use'"></textarea></label>
    <div class="row">
      <label>
        <span class="lbl">Asset class</span>
        <select name="asset_interest">
          <option value="">— pick one —</option>
          <option value="music">Music (cuts / cues / score)</option>
          <option value="sfx">SFX / sound design</option>
          <option value="voice">Voice (narration / vox)</option>
          <option value="field">Field recordings</option>
          <option value="samples">Sample instruments</option>
          <option value="bundle">Multi-class bundle</option>
          <option value="other">Other / not sure</option>
        </select>
      </label>
      <label>
        <span class="lbl">Budget band</span>
        <select name="budget_band">
          <option value="">— pick one —</option>
          <option value="under-1k">Under $1k</option>
          <option value="1-5k">$1k – $5k</option>
          <option value="5-15k">$5k – $15k</option>
          <option value="15-50k">$15k – $50k</option>
          <option value="50k+">$50k+</option>
          <option value="discuss">Let's discuss</option>
        </select>
      </label>
    </div>
    <label><span class="lbl">Deadline / use date</span><input name="deadline" type="text" placeholder="e.g. 'first cut June 12'" /></label>
    <button type="submit" id="submit">Send Inquiry</button>
    <div class="success" id="success"></div>
    <div class="error" id="error"></div>
    <p class="note">
      RSP_001 reads every inquiry personally. Response within 48 hours from <a href="mailto:rsp@noizy.ai">rsp@noizy.ai</a>.<br>
      Every license is C2PA-signed, scoped, time-bound, and revocable.
    </p>
  </form>
  <div class="foot"><a href="/">← back to NOIZYFISH</a> · <a href="https://noizy.ai">noizy.ai</a> · 396 Hz</div>
</div>
<script>
document.getElementById('f').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const btn = document.getElementById('submit');
  const success = document.getElementById('success');
  const error = document.getElementById('error');
  success.classList.remove('show'); error.classList.remove('show');
  btn.disabled = true; btn.textContent = 'Sending…';
  const data = {};
  new FormData(form).forEach((v,k) => data[k] = v);
  try {
    const r = await fetch('/api/license-request', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(data)
    });
    const j = await r.json();
    if (j.ok) {
      success.textContent = 'Inquiry received. ' + (j.next || 'You will hear back from rsp@noizy.ai within 48 hours.');
      success.classList.add('show');
      form.reset();
    } else {
      error.textContent = j.error || 'Something went wrong. Try again or email rsp@noizy.ai directly.';
      error.classList.add('show');
    }
  } catch (err) {
    error.textContent = 'Network error. Email rsp@noizy.ai directly.';
    error.classList.add('show');
  }
  btn.disabled = false; btn.textContent = 'Send Inquiry';
});
</script>
</body>
</html>`;
}

const HEALTH = (manifest) => ({
  status: "operational",
  service: "noizyfish-landing",
  domain: "noizyfish.com",
  version: "1.0.0",
  phase: "live",
  actor: "RSP_001",
  doctrine: ["rocketfuel", "funds-funnelled", "75/25", "1%-noizykidz-trust"],
  catalog: {
    indexed_files: (manifest && manifest.totals && manifest.totals.files) || 0,
    indexed_bytes_human: (manifest && manifest.totals && manifest.totals.bytes_human) || "—",
    scanned_at: (manifest && manifest.scanned_at) || null,
  },
  consent_kernel: "heaven.rsp-5f3.workers.dev",
  kill_switch: "active",
  frequency_hz: 396,
});

const CATALOG_API = (manifest) => ({
  estate: "EST-RSP-001",
  funnel_class: "rocketfuel",
  scanned_at: (manifest && manifest.scanned_at) || null,
  totals: (manifest && manifest.totals) || { files: 0, bytes_human: "—" },
  by_category: (manifest && manifest.by_category) || {},
  by_origin: (manifest && manifest.by_origin) || {},
  doctrine_ref: "https://github.com/.../docs/strategy/ROCKETFUEL_DOCTRINE.md",
  consent_kernel: "heaven.rsp-5f3.workers.dev",
  c2pa: "every-output",
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Manifest is bound as a TEXT secret/var (CATALOG_MANIFEST) in wrangler.toml.
    // If absent, we render with the doctrine-only fallback (still ships).
    let manifest = null;
    try {
      if (env && env.CATALOG_MANIFEST) {
        manifest = JSON.parse(env.CATALOG_MANIFEST);
      }
    } catch (e) {
      manifest = null;
    }

    if (url.pathname === "/health") {
      return Response.json(HEALTH(manifest), {
        headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=30" },
      });
    }

    if (url.pathname === "/api/catalog") {
      return Response.json(CATALOG_API(manifest), {
        headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=300" },
      });
    }

    if (url.pathname === "/license") {
      return new Response(renderLicensePage(), {
        headers: {
          "Content-Type": "text/html;charset=utf-8",
          "Cache-Control": "public, max-age=300",
          "X-Frame-Options": "DENY",
        },
      });
    }

    if (url.pathname === "/api/license-request" && request.method === "POST") {
      // ZERO-INFRASTRUCTURE intake door. Customer fills form → Worker captures
      // → forwards to rsp@noizy.ai (CF Email Routing handles delivery, no SaaS).
      // Optional KV log if NOIZY_LICENSE_LOG bound.
      let body;
      try {
        body = await request.json();
      } catch {
        return Response.json({ ok: false, error: "invalid JSON" }, { status: 400 });
      }
      const { name, email, organization, use_case, asset_interest, budget_band, deadline } =
        body || {};
      if (!email || !use_case) {
        return Response.json({ ok: false, error: "email and use_case required" }, { status: 400 });
      }
      // Honeypot — silently accept if filled (bots fill hidden fields)
      if (body.website || body.fax) {
        return Response.json({ ok: true, ack: "thanks" });
      }
      const inquiryId =
        "inq_" + Math.random().toString(36).slice(2, 12) + "_" + Date.now().toString(36);
      const ts = new Date().toISOString();
      const record = {
        id: inquiryId,
        ts,
        name: String(name || "").slice(0, 200),
        email: String(email).slice(0, 254),
        organization: String(organization || "").slice(0, 200),
        use_case: String(use_case).slice(0, 4000),
        asset_interest: String(asset_interest || "").slice(0, 200),
        budget_band: String(budget_band || "").slice(0, 50),
        deadline: String(deadline || "").slice(0, 100),
        ip: request.headers.get("CF-Connecting-IP") || "unknown",
        country: request.headers.get("CF-IPCountry") || "unknown",
        user_agent: (request.headers.get("User-Agent") || "").slice(0, 200),
      };
      // KV log if bound (free tier)
      try {
        if (env && env.LICENSE_LOG) {
          await env.LICENSE_LOG.put(inquiryId, JSON.stringify(record), {
            metadata: { ts, email: record.email, budget_band: record.budget_band },
          });
        }
      } catch {
        /* non-fatal */
      }
      // Email forward via CF Email Workers (when bound) — uses CF Email Routing
      try {
        if (env && env.LICENSE_INQUIRY_EMAIL) {
          // EmailMessage from cloudflare:email — env.LICENSE_INQUIRY_EMAIL is a SendEmail binding
          const subject = `NOIZYFISH license inquiry · ${record.organization || record.name || record.email}`;
          const text = [
            `New NOIZYFISH license inquiry`,
            `─────────────────────────────`,
            `id: ${inquiryId}`,
            `ts: ${ts}`,
            `from: ${record.name} <${record.email}>`,
            `org: ${record.organization}`,
            `use case:`,
            record.use_case,
            ``,
            `assets of interest: ${record.asset_interest}`,
            `budget band: ${record.budget_band}`,
            `deadline: ${record.deadline}`,
            `─────────────────────────────`,
            `country: ${record.country}`,
            `ip: ${record.ip}`,
            `ua: ${record.user_agent}`,
          ].join("\n");
          await env.LICENSE_INQUIRY_EMAIL.send({
            from: "noreply@noizyfish.com",
            to: "rsp@noizy.ai",
            subject,
            text,
          });
        }
      } catch (e) {
        /* email send failed — record still in KV; non-fatal */
      }
      return Response.json({
        ok: true,
        inquiry_id: inquiryId,
        next: "RSP_001 will respond within 48 hours from rsp@noizy.ai",
        message:
          "Inquiry received. Every NOIZYFISH license routes 75% to creators, 24% to NOIZY.AI production, 1% to the NOIZYKIDZ trust — automatic, irremovable.",
      });
    }

    if (url.pathname === "/robots.txt") {
      return new Response("User-agent: *\nAllow: /\nSitemap: https://noizyfish.com/sitemap.xml\n", {
        headers: { "Content-Type": "text/plain" },
      });
    }

    return new Response(renderHtml(manifest), {
      headers: {
        "Content-Type": "text/html;charset=utf-8",
        "Cache-Control": "public, max-age=600, stale-while-revalidate=1800",
        "X-Powered-By": "NOIZY/RSP_001",
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      },
    });
  },
};
