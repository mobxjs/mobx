/**
 * @jest-environment node
 */
import { transform, code } from "./utils/transform"

function expectTransform(input: string, expected: string, opts?: Parameters<typeof transform>[1]) {
    expect(transform(input, opts)).toBe(expected)
}

describe("async methods of observable classes become flows", () => {
    test("makeAutoObservable", () => {
        expectTransform(
            code`
import { makeAutoObservable } from "mobx"
class UserStore {
    user = null
    constructor() { makeAutoObservable(this) }
    async loadUser(id: string) { this.user = await api.getUser(id) }
}`,
            code`
import { makeAutoObservable } from "mobx";
class UserStore {
  user = null;
  constructor() {
    makeAutoObservable(this);
  }
  *loadUser(id: string) {
    this.user = yield api.getUser(id);
  }
}`
        )
    })

    test("makeAutoObservable overrides are respected, `action` on an async method becomes `flow`", () => {
        expectTransform(
            code`
import { makeAutoObservable, action, flow, observable } from "mobx"
class Store {
    constructor() { makeAutoObservable(this, { load: false, save: action, refresh: flow, value: observable }, { autoBind: true }) }
    async load() { await a() }
    async save() { await a() }
    async refresh() { await a() }
    async other() { await a() }
}`,
            code`
import { makeAutoObservable, action, flow, observable } from "mobx";
class Store {
  constructor() {
    makeAutoObservable(this, {
      load: false,
      save: flow,
      refresh: flow,
      value: observable
    }, {
      autoBind: true
    });
  }
  async load() {
    await a();
  }
  *save() {
    yield a();
  }
  *refresh() {
    yield a();
  }
  *other() {
    yield a();
  }
}`
        )
    })

    test("makeObservable: members annotated with flow or action (rewritten to flow)", () => {
        expectTransform(
            code`
import { makeObservable, action, flow, observable } from "mobx"
class Store {
    constructor() { makeObservable(this, { load: flow, save: action, sync: action.bound, reset: action, value: observable }) }
    async load() { await a() }
    async save() { await a() }
    async sync() { await a() }
    reset() {}
    async value() { await a() }
}`,
            code`
import { makeObservable, action, flow, observable } from "mobx";
class Store {
  constructor() {
    makeObservable(this, {
      load: flow,
      save: flow,
      sync: flow.bound,
      reset: action,
      value: observable
    });
  }
  *load() {
    yield a();
  }
  *save() {
    yield a();
  }
  *sync() {
    yield a();
  }
  reset() {}
  async value() {
    await a();
  }
}`
        )
    })

    test("2023-11 decorators without makeObservable", () => {
        expectTransform(
            code`
import { action, observable } from "mobx"
class Store {
    @observable accessor user = null
    @action async load() { this.user = await a() }
    @action sync() { this.user = null }
}`,
            code`
import { action, observable, flow } from "mobx";
class Store {
  @observable
  accessor user = null;
  @flow
  *load() {
    this.user = yield a();
  }
  @action
  sync() {
    this.user = null;
  }
}`
        )
    })

    test("the flow import is added when it is missing, under a unique name if needed", () => {
        expectTransform(
            code`
import { action } from "mobx"
const flow = 1
class Store {
    @action async load() { await a() }
}`,
            code`
import { action, flow as _flow } from "mobx";
const flow = 1;
class Store {
  @_flow
  *load() {
    yield a();
  }
}`
        )
    })

    test("classes without a MobX call in the constructor are left alone", () => {
        const input = code`
class Service {
    async load() { await a() }
}
class Later {
    constructor() {}
    init() { makeAutoObservable(this) }
    async load() { await a() }
}
class Unknown {
    constructor() { makeAutoObservable(this, overrides) }
    async load() { await a() }
}`
        expectTransform(
            input,
            code`
class Service {
  async load() {
    await a();
  }
}
class Later {
  constructor() {}
  init() {
    makeAutoObservable(this);
  }
  async load() {
    await a();
  }
}
class Unknown {
  constructor() {
    makeAutoObservable(this, overrides);
  }
  async load() {
    await a();
  }
}`
        )
    })

    test("methods that cannot become flows are left alone", () => {
        expectTransform(
            code`
class Store {
    constructor() { makeAutoObservable(this) }
    async noAwait() { return a() }
    async iterates() { for await (const x of stream()) { this.items.push(x) } }
    static async create() { return new Store(await a()) }
    async *gen() { yield await a() }
    async [computed]() { await a() }
    async #secret() { await a() }
    get value() { return 1 }
}`,
            code`
class Store {
  constructor() {
    makeAutoObservable(this);
  }
  async noAwait() {
    return a();
  }
  async iterates() {
    for await (const x of stream()) {
      this.items.push(x);
    }
  }
  static async create() {
    return new Store(await a());
  }
  async *gen() {
    yield await a();
  }
  async [computed]() {
    await a();
  }
  async #secret() {
    await a();
  }
  get value() {
    return 1;
  }
}`
        )
    })

    test("only the method's own awaits are replaced, with the right precedence", () => {
        expectTransform(
            code`
class Store {
    constructor() { makeAutoObservable(this) }
    async loadAll(ids) {
        const users = await Promise.all(ids.map(async id => await api.getUser(id)))
        const total = await a() + await b()
        try { this.users = users } catch (e) { await report(e) } finally { await done() }
        return await users
    }
}`,
            code`
class Store {
  constructor() {
    makeAutoObservable(this);
  }
  *loadAll(ids) {
    const users = yield Promise.all(ids.map(async id => await api.getUser(id)));
    const total = (yield a()) + (yield b());
    try {
      this.users = users;
    } catch (e) {
      yield report(e);
    } finally {
      yield done();
    }
    return yield users;
  }
}`
        )
    })
})

describe("async methods of observable object literals become flows", () => {
    test("makeAutoObservable()", () => {
        expectTransform(
            code`
const a = makeAutoObservable({ async load() { await x() } })`,
            code`
const a = makeAutoObservable({
  *load() {
    yield x();
  }
});`
        )
    })

    test("overrides and explicit annotations", () => {
        expectTransform(
            code`
const a = makeAutoObservable({ async load() { await x() }, async save() { await x() } }, { save: false })
const b = makeObservable({ async load() { await x() }, async save() { await x() } }, { load: flow })`,
            code`
const a = makeAutoObservable({
  *load() {
    yield x();
  },
  async save() {
    await x();
  }
}, {
  save: false
});
const b = makeObservable({
  *load() {
    yield x();
  },
  async save() {
    await x();
  }
}, {
  load: flow
});`
        )
    })

    test("function expressions are converted, arrow functions are not (they would rebind this)", () => {
        expectTransform(
            code`
const a = makeAutoObservable({ load: async function () { await x() }, save: async () => { await x() } })`,
            code`
const a = makeAutoObservable({
  load: function* () {
    yield x();
  },
  save: async () => {
    await x();
  }
});`
        )
    })
})

describe("options", () => {
    const store = code`
class Store {
    constructor() { makeAutoObservable(this) }
    async load() { await a() }
}
export function View() { return <div /> }`

    test("flow: false", () => {
        expectTransform(
            store,
            code`
import { observer } from "mobx-react-lite";
class Store {
  constructor() {
    makeAutoObservable(this);
  }
  async load() {
    await a();
  }
}
export const View = observer(function View() {
  "use no memo";

  return <div />;
});`,
            { options: { flow: false } }
        )
    })

    test("observer: false keeps the flow transform", () => {
        expectTransform(
            store,
            code`
class Store {
  constructor() {
    makeAutoObservable(this);
  }
  *load() {
    yield a();
  }
}
export function View() {
  return <div />;
}`,
            { options: { observer: false } }
        )
    })
})
