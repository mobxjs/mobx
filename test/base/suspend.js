"use strict"
import { when, observable, computed } from "../../src/mobx.ts"

test("computeds can return a promise", async () => {
    const x = observable({
        get x() {
            return Promise.resolve(3)
        }
    })

    debugger
    const p = when(() => x.x.value === 3)
    p.catch(err => {
        fail(err)
    })
    expect(x.x).toEqual({ previousValue: undefined, state: "pending", value: undefined })
    await p
})

// untracked will throw

// reject

// nested computes update

// promises react

// promise resolve only once and with the latest

/*
class User {
    @observable name

    @computed
    get profile() {
      // return a promise
      return fetch(`/endpoint/${name}`)
    }

    @computed
    get profileImageUrl() {
       // pluck the image from the profile promise
       return this.profile.state === "fullfilled"
          ? this.profile.value.image
          : "/defaultavatar.png"
    }

    @computed({ initialValue: [] })
    get tags() {
       // chain another promise onto the profile promise
       return this.profile.then(() =>
          fetch(`/endpoint/${name}/tags`)
       })
    }

    @computed
    get isLoading() {
       // are we fetching data?
       return this.profile.state === "pending" || this.tags.state === "pending
    }

    @computed
    get isLoadingTakingLong() {
      // provide spinner if loading takes long!
      return Promise.race([
         new Promise(resolve => setTimeout(() => resolve(true), 1000),
         new Promise(resolve => this.isLoading.then((done) => { if (done) resolve(false) })
      ])
    }
}

const UserView = observer(({ user }) => (
   <div>
       <h1>{user.name}<h1/>
  	   { user.isLoadingTakingLong && <Spinner /> }
       <img src={user.profileImageUrl} />
       { user.tags.value.join(" - ") }
   </div>
))
*/
