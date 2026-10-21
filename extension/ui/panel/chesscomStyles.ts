export const CHESSCOM_PANEL_STYLES = `
:host {
  all: initial;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, Helvetica, Arial, sans-serif;
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
  background: linear-gradient(180deg, #81B64C 0%, #5D9948 100%);
  box-shadow: inset 0 .1rem 0 0 rgba(216, 250, 157, .4), 0 .2rem .8rem rgba(0, 0, 0, .4);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform .15s ease;
}
.fab:hover { transform: scale(1.06); }
.fab:active { transform: scale(0.96); }
.fab svg { width: 2.6rem; height: 2.6rem; }

.fab-status {
  position: absolute;
  top: -.2rem;
  right: -.2rem;
  width: 1.2rem;
  height: 1.2rem;
  border-radius: 50%;
  border: .2rem solid #262421;
  background: #81B64C;
}
.fab-status[data-state="stopped"] { background: #8B8987; }
.fab-status[data-state="error"] { background: #E02828; }
.fab-status[data-state="thinking"] { background: #F7C631; animation: pulse 1s ease-in-out infinite; }

@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }

.panel {
  position: fixed;
  right: 2.4rem;
  bottom: 9rem;
  z-index: 2147483000;
  width: 32rem;
  max-height: 70vh;
  overflow-y: auto;
  background: #262421;
  color: rgba(255, 255, 255, .85);
  border-radius: 1rem;
  box-shadow: 0 .8rem 2.4rem rgba(0, 0, 0, .65);
  border: .1rem solid rgba(255, 255, 255, .1);
  font-size: 1.3rem;
  line-height: 1.4;
}
.panel[hidden] { display: none; }

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.2rem 1.6rem;
  border-bottom: .1rem solid rgba(255, 255, 255, .1);
}
.panel-title {
  font-weight: 600;
  font-size: 1.5rem;
  color: #fff;
}
.panel-close {
  background: none;
  border: none;
  color: rgba(255, 255, 255, .5);
  cursor: pointer;
  font-size: 1.8rem;
  line-height: 1;
  padding: 0 .4rem;
}
.panel-close:hover { color: #fff; }

.panel-section {
  padding: 1.2rem 1.6rem;
  border-bottom: .1rem solid rgba(255, 255, 255, .08);
}
.panel-section:last-child { border-bottom: none; }

.section-label {
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: .03em;
  color: rgba(255, 255, 255, .5);
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
.row-label { color: rgba(255, 255, 255, .85); }

.control-buttons {
  display: flex;
  gap: .8rem;
}

button.cc-btn {
  font-family: inherit;
  font-size: 1.3rem;
  font-weight: 600;
  border: none;
  border-radius: .5rem;
  padding: .7rem 1.2rem;
  cursor: pointer;
  color: #fff;
  flex: 1;
}
button.cc-btn.primary {
  background: linear-gradient(180deg, #81B64C 0%, #5D9948 100%);
  box-shadow: inset 0 .1rem 0 0 rgba(216, 250, 157, .3), 0 .1rem .2rem rgba(0, 0, 0, .14);
}
button.cc-btn.primary:hover { filter: brightness(1.08); }
button.cc-btn.secondary {
  background: rgba(255, 255, 255, .08);
}
button.cc-btn.secondary:hover { background: rgba(255, 255, 255, .14); }
button.cc-btn:disabled { opacity: .5; cursor: default; }

select.cc-select, input.cc-input {
  font-family: inherit;
  font-size: 1.3rem;
  background: rgba(255, 255, 255, .08);
  border: .1rem solid rgba(255, 255, 255, .1);
  border-radius: .5rem;
  color: rgba(255, 255, 255, .85);
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
  accent-color: #81B64C;
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
  background: rgba(255, 255, 255, .16);
  border-radius: 2rem;
  cursor: pointer;
  transition: background .15s ease;
}
.cc-toggle input:checked + .cc-toggle-track {
  background: linear-gradient(180deg, #81B64C 0%, #5D9948 100%);
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
  background: rgba(255, 255, 255, .08);
  border-radius: .5rem;
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
  color: rgba(255, 255, 255, .5);
  font-weight: 400;
  font-size: 1.05rem;
}
table.moves-table td:first-child { font-weight: 600; }

.status-line {
  font-size: 1.15rem;
  color: rgba(255, 255, 255, .5);
}
.status-line.error { color: #FF8A75; }
`;
