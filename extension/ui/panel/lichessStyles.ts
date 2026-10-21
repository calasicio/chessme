export const LICHESS_PANEL_STYLES = `
:host {
  all: initial;
  font-family: 'Noto Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}

* {
  box-sizing: border-box;
}

.fab {
  position: fixed;
  right: 2.4rem;
  bottom: 2.4rem;
  z-index: 2147483000;
  width: 5.2rem;
  height: 5.2rem;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  background: hsl(209, 79%, 56%);
  box-shadow: 0 2px 8px rgb(0 0 0 / 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: filter .15s ease;
}
.fab:hover { filter: brightness(1.15); }
.fab:active { filter: brightness(0.9); }
.fab svg { width: 2.6rem; height: 2.6rem; }

.fab-status {
  position: absolute;
  top: -.2rem;
  right: -.2rem;
  width: 1.2rem;
  height: 1.2rem;
  border-radius: 50%;
  border: .2rem solid hsl(37, 10%, 8%);
  background: hsl(88, 62%, 37%);
}
.fab-status[data-state="stopped"] { background: hsl(0, 0%, 55%); }
.fab-status[data-state="error"] { background: hsl(0, 60%, 50%); }
.fab-status[data-state="thinking"] { background: hsl(22, 100%, 42%); animation: pulse 1s ease-in-out infinite; }

@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }

.panel {
  position: fixed;
  right: 2.4rem;
  bottom: 9rem;
  z-index: 2147483000;
  width: 32rem;
  max-height: 70vh;
  overflow-y: auto;
  background: hsl(37, 7%, 14%);
  color: hsl(0, 0%, 73%);
  border-radius: 3px;
  box-shadow: 0 14px 28px rgb(0 0 0 / 0.15), 0 10px 10px rgb(0 0 0 / 0.12);
  border: 1px solid hsl(37, 5%, 24%);
  font-size: 1.3rem;
  line-height: 1.4;
}
.panel[hidden] { display: none; }

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.2rem 1.6rem;
  border-bottom: 1px solid hsl(37, 5%, 24%);
}
.panel-title {
  font-weight: 700;
  font-size: 1.5rem;
  color: hsl(0, 0%, 90%);
}
.panel-close {
  background: none;
  border: none;
  color: hsl(0, 0%, 60%);
  cursor: pointer;
  font-size: 1.8rem;
  line-height: 1;
  padding: 0 .4rem;
}
.panel-close:hover { color: hsl(0, 0%, 90%); }

.panel-section {
  padding: 1.2rem 1.6rem;
  border-bottom: 1px solid hsl(37, 5%, 20%);
}
.panel-section:last-child { border-bottom: none; }

.section-label {
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: .03em;
  color: hsl(0, 0%, 55%);
  margin: 0 0 .8rem;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .8rem;
  margin-bottom: .8rem;
}
.row:last-child { margin-bottom: 0; }
.row-label { color: hsl(0, 0%, 73%); }

.control-buttons {
  display: flex;
  gap: .8rem;
}

button.cc-btn {
  font-family: inherit;
  font-size: 1.2rem;
  font-weight: 500;
  text-transform: uppercase;
  border: none;
  border-radius: 3px;
  padding: .8em 1em;
  cursor: pointer;
  color: #fff;
  text-shadow: 0.5px 0.5px 0 rgb(0 0 0 / 0.4);
  flex: 1;
}
button.cc-btn.primary {
  background: hsl(209, 79%, 56%);
}
button.cc-btn.primary:hover { filter: brightness(1.15); }
button.cc-btn.secondary {
  background: hsl(37, 7%, 22%);
  text-shadow: none;
}
button.cc-btn.secondary:hover { filter: brightness(1.15); }
button.cc-btn:disabled { opacity: .5; cursor: not-allowed; }

select.cc-select, input.cc-input {
  font-family: inherit;
  font-size: 1.3rem;
  background: hsl(37, 7%, 22%);
  border: 1px solid hsl(37, 5%, 28%);
  border-radius: 3px;
  color: hsl(0, 0%, 85%);
  padding: .5rem .8rem;
}
select.cc-select { min-width: 9rem; }
input.cc-input[type="number"] { width: 7rem; }
input.cc-input[type="color"] {
  width: 3.2rem;
  height: 2.6rem;
  padding: .2rem;
  cursor: pointer;
}

input[type="range"].cc-range {
  flex: 1;
  accent-color: hsl(209, 79%, 56%);
}

.cc-toggle {
  position: relative;
  display: inline-block;
  width: 3.6rem;
  height: 2rem;
  flex-shrink: 0;
}
.cc-toggle input { opacity: 0; width: 0; height: 0; }
.cc-toggle-track {
  position: absolute;
  inset: 0;
  background: hsl(37, 5%, 28%);
  border-radius: 2rem;
  cursor: pointer;
  transition: background .15s ease;
}
.cc-toggle input:checked + .cc-toggle-track {
  background: hsl(209, 79%, 56%);
}
.cc-toggle-track::before {
  content: "";
  position: absolute;
  width: 1.6rem;
  height: 1.6rem;
  left: .2rem;
  top: .2rem;
  background: #fff;
  border-radius: 50%;
  transition: transform .15s ease;
}
.cc-toggle input:checked + .cc-toggle-track::before {
  transform: translateX(1.6rem);
}

.win-bar {
  position: relative;
  height: 2.4rem;
  background: hsl(37, 7%, 22%);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 1rem;
}
.win-bar-fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: #fff;
  transition: width .2s ease;
}
.win-bar-label {
  position: relative;
  z-index: 1;
  display: block;
  text-align: center;
  line-height: 2.4rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: #111;
  mix-blend-mode: screen;
}

table.moves-table {
  width: 100%;
  border-collapse: collapse;
}
table.moves-table th, table.moves-table td {
  text-align: left;
  padding: .4rem .2rem;
  font-size: 1.2rem;
}
table.moves-table th {
  color: hsl(0, 0%, 55%);
  font-weight: 400;
  font-size: 1.05rem;
}
table.moves-table td:first-child { font-weight: 600; }

.status-line {
  font-size: 1.15rem;
  color: hsl(0, 0%, 55%);
}
.status-line.error { color: hsl(0, 60%, 60%); }
`;
