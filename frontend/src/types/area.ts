import { Gate } from "./gate";

export interface Area {
    id: number;
    name: string;
    is_active: boolean;
    gates: Gate[],
}
