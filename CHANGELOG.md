# sourced v4
- Typescript rewrite - thanks to work on this at https://github.com/PDMLab/sourced-ts by @alexander.zeitler and @stephanknull, pulled in by @patrickleet
- BREAKING CHANGE: now publishes ESM and CJS modules at /dist/esm and /dist/cjs

# sourced v3
- Browser support by using `eventemitter3.EventEmitter` instead of Node `events.EventEmitter` by @patrickleet
- BREAKING CHANGE: `Entity` is now `EntityProxy`. `SourcedEntity` is now `Entity`

# sourced v2
- updated to ES6 syntax by @patrickleet
- `SourcedEntity` an ES6 implementation of `Entity` added.
- `Entity` is now just a proxy to the new `SourcedEntity` ES6 class. 
- Deprecation notice: `SourcedEntity` will become `Entity` in the next major version, and `Entity`, which is now a proxy, left for backwards compatibility 

# sourced v1
- original lib by @mateodelnorte - battle tested in financial systems that tranact billions of dollars.