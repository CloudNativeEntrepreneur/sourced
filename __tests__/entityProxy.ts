import { EntityProxy, Entity } from "../src/index";
import util from "util";
import debug from "debug";

const log = debug("sourced");

function User(...args: any[]) {
  this.apps = {};
  this.username = "";
  this.password = this.pass = "";

  EntityProxy.apply(this, ...args);
}

util.inherits(User, EntityProxy);

User.prototype.grant = function (param) {
  this.apps[param.appId] = param;
  this.digest("grant", param);
  this.emit("granted", param, this);
};

Entity.digestMethod(User, function changePassword(password) {
  this.password = password;
  this.emit("password.changed");
});

function Inventory(...args: any[]) {
  this.products = [];

  EntityProxy.apply(this, ...args);
}

util.inherits(Inventory, EntityProxy);

function Wheel(
  { status } = {
    status: "stopped",
  }
) {
  this.status = status;
}

Wheel.prototype.go = function () {
  this.status = "going";
};

function Car(...args: any[]) {
  this.id = null;
  this.wheel = new Wheel(); // for instantiating our default wheel, when we first 'new' up a Car

  EntityProxy.apply(this, ...args);
}

util.inherits(Car, EntityProxy);

Entity.mergeProperty(Car, "wheel", function (obj) {
  this.wheel = new Wheel(obj.wheel); // for instantiating our wheel from saved values in a database
});

describe("entityProxy", () => {
  it("allows users to use prototypical inheritance with new ES6 class", () => {
    const user = new User();
    const inventory = new Inventory();

    expect(user.apps).toEqual({});
    expect(user.username).toEqual("");
    expect(user.pass).toEqual("");
    expect(user.on).toBeDefined();
    expect(user.digest).toBeDefined();
    expect(user.grant).toBeDefined();

    expect(inventory.on).toBeDefined();

    user.changePassword("lol");

    expect(user.password).toEqual("lol");
  });
  it("should throw error if digestMethod params are invalid", () => {
    try {
      Entity.digestMethod(User, function () {
        log("hello");
      });
    } catch (err) {
      expect(err).toEqual(
        Error(
          "Anonmyous functions are not allowed in digest method definitions. Please provide a function name"
        )
      );
    }
  });

  it("merge properties", () => {
    const car = new Car();

    expect(car.wheel instanceof Wheel).toEqual(true);

    car.wheel.go();

    expect(car.wheel.status).toEqual("going");
  });
});
