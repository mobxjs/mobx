makeObservable();
makeObservable(foo, {});
makeObservable(this, {});
makeAutoObservable();
makeAutoObservable(foo, {});
makeAutoObservable(this, {});

// Exhaustive
makeObservable({
  o: 5,
  a() { },
  get c() { },
});

makeObservable({
  o: 5,
  a() { },
  get c() { },
}, {
  o: observable,
  a: action,
  c: computed,
});

class Exhaustive1 {
  o = 5;
  a() { };
  get c() { };

  constructor() {
    makeObservable(this)
  }
}

class Exhaustive2 {
  o = 5;
  a() { };
  get c() { };

  constructor() {
    makeObservable(this, {
      o: observable,
      a: action,
      c: computed,
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