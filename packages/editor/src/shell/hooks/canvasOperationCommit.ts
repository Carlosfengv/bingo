/*
 * Synchronous commit boundary for formal canvas writes. Candidate construction
 * is side-effect free; publication, history and lock updates happen in the one
 * callback after the expected store identity has been revalidated.
 */
import { applyOperationsToStore } from "../../shared/utils/operations";

class CanvasRevisionConflictError extends Error {
  constructor() {
    super("Canvas changed while the operation was being prepared. No canvas changes were applied.");
    this.name = "CanvasRevisionConflictError";
    this.code = "CANVAS_REVISION_CONFLICT";
  }
}

function createCanvasCommitCandidate(expectedStore) {
  return {
    expectedStore,
    nextStore: expectedStore,
    operations: []
  };
}

function appendCanvasCandidateOperation(candidate, operation) {
  candidate.nextStore = applyOperationsToStore(candidate.nextStore, [operation]);
  candidate.operations.push(operation);
  return candidate.nextStore;
}

function commitCanvasCandidate(candidate, currentStore, commit) {
  if (currentStore !== candidate.expectedStore) throw new CanvasRevisionConflictError();
  if (candidate.operations.length === 0) return candidate.nextStore;
  commit({
    nextStore: candidate.nextStore,
    operations: candidate.operations
  });
  return candidate.nextStore;
}

export { CanvasRevisionConflictError, appendCanvasCandidateOperation, commitCanvasCandidate, createCanvasCommitCandidate };
