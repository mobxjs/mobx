/* eslint mobx/exhaustive-make-observable: "error" */
/* eslint mobx/missing-make-observable: "error" */
/* eslint mobx/unconditional-make-observable: "error" */

makeObservable();
makeObservable(foo, {});
makeObservable(this, {});
makeAutoObservable();
makeAutoObservable(foo, {});
makeAutoObservable(this, {});

makeObservable({
  o: 5,
  a() { },
  get c() { },
  set c() { },
  "lit": 1,
  [cmp()]() { },
});

// ok
makeObservable({
  o: 5,
  a() { },
  get c() { },
  set c() { },
  "lit": 1,
}, {
  o: observable,
  a: action,
  c: computed,
  "lit": 1,
  [cmp()]() { },
});

class Exhaustive1 {
  o = 5;
  a() { };
  get c() { };
  set c() { };
  "lit" = 1;
  [cmp()]() { };

  constructor() {
    makeObservable(this, {})
  }
}

class Exhaustive2 {
  o = 5;
  a() { };
  get c() { };
  set c() { };
  "lit" = 1;
  [cmp()]() { };

  constructor() {
    // ok
    makeObservable(this, {
      o: observable,
      a: action,
      c: computed,
      "lit": 1,
      [cmp()]() { },
    })
  }
}

class Exhaustive3 {
  o = 5;
  o2 = 5;
  a() { };
  a2() { };
  get c() { };
  get c2() { };

  constructor() {
    makeObservable(this, {
      o: observable,
      a: action,
      c: computed,
    })
  }
}

class Exhaustive4 {
  o = 5;
  a() { };
  get c() { };

  constructor() {
    function a() {
      makeObservable(this) // ok - `this` doesn't refer to class instance  
    }
  }
}

class Exhaustive4 {
  o = 5;
  a() { };
  get c() { };

  constructor() {
    makeObservable({}); // ok - not making `this` observable 
  }
}

class Unconditional2 {
  constructor() {
    makeObservable(this, {}); // ok - no condition
    makeObservable() // ok - no `this`
    makeObservable({}) // ok - no `this`
    if (true) {
      makeObservable(this, {});
      makeAutoObservable(this, {});
    }
    for (let i = 0; i < 1; i++) {
      makeObservable(this, {});
      makeAutoObservable(this, {});
    }
    while (Math.random() > 1) {
      makeObservable(this, {});
      makeAutoObservable(this, {});
    }
    const a = () => {
      makeObservable(this, {});
    }
    function f() {
      makeObservable(this, {}); // ok - `this` doesn't refer to class instance    
    }
    const ff = function () {
      makeObservable(this, {}); // ok - `this` doesn't refer to class instance    
    }
  }
}

class MissingMakeObservable1 {
  @observable o = 5;
}

class MissingMakeObservable2 {
  @observable o = 5;
  constructor() { }
}

class MissingMakeObservable3 {
  @observable o = 5;
  constructor() {
    makeObservable({})
  }
}

class MissingMakeObservable4 {
  @observable o = 5;
  constructor()
}

// ok
class MissingMakeObservable5 {
  @observable o = 5;
  constructor() {
    makeObservable(this)
  }
}