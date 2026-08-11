import type { STEEPLECHASE_SPECS } from '../utils/paceCalculations';

export type PaceResult = {
  readonly pacePerKm: string;
  readonly pace400m: string;
  readonly pace100m: string;
  readonly speedKmh: string;
  readonly finishTime: string;
};

export type TimeValue = number | null;

export type WaterJumpPlacement = 'INSIDE' | 'OUTSIDE';

export type SteepleSplitDetails = {
  readonly spec: (typeof STEEPLECHASE_SPECS)[WaterJumpPlacement];
  readonly startTime: number;
  readonly lapTime: number;
  readonly rows: readonly {
    readonly label: string;
    readonly distance: number;
    readonly cumulative: number;
  }[];
};
