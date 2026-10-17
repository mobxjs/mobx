import "@testing-library/jest-dom/extend-expect"
import { cleanup } from "@testing-library/react"
import * as mobx from "mobx"
import { setupMobxTestState } from "../../jest.setup.base"

setupMobxTestState(mobx, cleanup)
