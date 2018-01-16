import { areBothNaN, identityComparer, defaultComparer, IEqualsComparer } from "../../mobx-core"
import { deepEqual } from "../utils/utils"

function structuralComparer(a: any, b: any): boolean {
	return deepEqual(a, b)
}

export const comparer = {
	identity: identityComparer,
	structural: structuralComparer,
	default: defaultComparer
}
