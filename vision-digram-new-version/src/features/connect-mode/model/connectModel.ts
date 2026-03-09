/**
 * connectFrom states:
 *   null       — connect mode off
 *   "pick"     — mode on, waiting for first shape
 *   "<id>"     — first shape selected, waiting for target
 */
export type ConnectState = string | null;

export function startConnect(): ConnectState {
  return "pick";
}

export function cancelConnect(): ConnectState {
  return null;
}

export function selectSource(shapeId: string): ConnectState {
  return shapeId;
}
