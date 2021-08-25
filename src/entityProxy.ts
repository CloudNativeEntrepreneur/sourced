import { Entity } from "./entity";
import debug from "debug";

const log = debug("sourced");

const proxyConstructor = {
  apply: (Target, thisArg, args) => {
    log(`Initializing ${Target.name} with:`, args);
    const entity = new Target();
    Object.assign(thisArg, entity);
    thisArg.rehydrate(...args);
  },
};

export const EntityProxy = new Proxy(Entity, proxyConstructor);
