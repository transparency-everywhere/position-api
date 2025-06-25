declare module "PositionTypes" {
  export interface Position {
    timestamp: string;
    latitude: number;
    longitude: number;
    course: number;
    speed: number;
    source: string;
    source_type: string;
    altitude?: number;
    raw?: any;
  }
}
