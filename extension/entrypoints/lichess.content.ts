import { LichessPositionSource } from '@/positionSource/lichess/lichessBoardReader';
import { clearMaiaArrows, drawMaiaSuggestions } from '@/positionSource/lichess/maiaOverlay';
import { findLichessBoard } from '@/positionSource/lichess/presence';
import { observeMoveList } from '@/positionSource/lichess/moveListParser';
import { detectPlayerColor } from '@/positionSource/lichess/playerColor';
import { requestMaiaEvaluation } from '@/messaging/maiaProtocol';
import { PanelController } from '@/ui/panel/PanelController';
import { loadSettings, onSettingsChanged, saveSettings } from '@/ui/panel/settingsStore';

function isContextInvalidated(error: unknown): boolean {
  return error instanceof Error && /context invalidated/i.test(error.message);
}

export default defineContentScript({
  matches: ['https://lichess.org/*'],
  async main() {
    let settings = await loadSettings();
    let lastAppliedSettingsJson = JSON.stringify(settings);
    let running = true;
    let currentBoard: Element | null = null;
    let moveListObserver: MutationObserver | null = null;
    let currentRequestId = 0;
    let contextInvalidated = false;

    const panel = new PanelController(
      {
        onSettingsChange: async (next) => {
          settings = next;
          lastAppliedSettingsJson = JSON.stringify(next);
          try {
            await saveSettings(next);
          } catch (error) {
            if (isContextInvalidated(error)) return;
            throw error;
          }
          void evaluateAndDraw();
        },
        onToggleRunning: () => {
          running = !running;
          panel.setRunState(running ? 'running' : 'stopped');
          if (running) void evaluateAndDraw();
          else if (currentBoard) clearMaiaArrows(currentBoard);
        },
        onRestart: () => {
          void evaluateAndDraw();
        },
      },
      settings,
      'lichess',
    );
    panel.setFabVisible(false);

    onSettingsChanged((next) => {
      const json = JSON.stringify(next);
      if (json === lastAppliedSettingsJson) return;
      lastAppliedSettingsJson = json;
      settings = next;
      panel.updateSettingsFromExternal(next);
    });

    async function evaluateAndDraw() {
      if (!running || !currentBoard || contextInvalidated) return;
      const requestId = ++currentRequestId;
      const board = currentBoard;

      const source = new LichessPositionSource(
        document,
        settings.eloSelf,
        settings.eloOppoMode === 'manual' ? settings.eloOppoManual : undefined,
      );

      let fen: string;
      try {
        fen = source.getFen();
      } catch {
        panel.setStatusMessage('No position to read yet.');
        return;
      }

      const myColor = detectPlayerColor(board);
      const sideToMove = fen.split(' ')[1];
      const isOpponentTurn = sideToMove !== myColor;

      if (isOpponentTurn && !settings.showOpponentLines) {
        clearMaiaArrows(board);
        panel.setStatus('idle');
        panel.setStatusMessage('Waiting for your move...');
        return;
      }

      panel.setStatus('thinking');
      panel.setStatusMessage('Evaluating...');

      let response;
      try {
        response = await requestMaiaEvaluation({
          fen,
          eloSelf: source.getEloSelf(),
          eloOppo: source.getEloOppo(),
          variant: settings.variant,
        });
      } catch (error) {
        if (isContextInvalidated(error)) {
          contextInvalidated = true;
          panel.setStatus('error');
          panel.setStatusMessage('Extension was reloaded — refresh this page to continue.', true);
          return;
        }
        panel.setStatus('error');
        panel.setStatusMessage(error instanceof Error ? error.message : String(error), true);
        return;
      }
      if (requestId !== currentRequestId) return;

      if (!response.ok) {
        panel.setStatus('error');
        panel.setStatusMessage(response.error, true);
        return;
      }

      const role = isOpponentTurn ? 'opponent' : 'self';
      const color = role === 'opponent' ? settings.opponentColor : settings.selfColor;
      drawMaiaSuggestions(board, response.prediction, { topN: settings.topN, color, role });
      panel.renderPrediction(response.prediction, { fenSource: source.lastFenSource!, role });
    }

    function attachMoveListObserver() {
      moveListObserver?.disconnect();
      moveListObserver = observeMoveList(document, () => void evaluateAndDraw());
    }

    function bootstrapForBoard(board: Element) {
      currentBoard = board;
      currentRequestId++;
      panel.setFabVisible(true);
      attachMoveListObserver();
      void evaluateAndDraw();
    }

    function teardown() {
      currentBoard = null;
      moveListObserver?.disconnect();
      moveListObserver = null;
      panel.setFabVisible(false);
    }

    const supervisor = new MutationObserver(() => {
      const board = findLichessBoard(document);
      const eligible = board;
      if (eligible && board !== currentBoard) {
        bootstrapForBoard(board);
      } else if (!eligible && currentBoard) {
        teardown();
      }
    });
    supervisor.observe(document.body, { childList: true, subtree: true });

    const initialBoard = findLichessBoard(document);
    if (initialBoard) bootstrapForBoard(initialBoard);
  },
});
