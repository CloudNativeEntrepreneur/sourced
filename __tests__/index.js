import {
  Entity,
  Value,
  EntityProxy
} from '../src/index'

describe('index', () => {
  it('exports Entity, Value, EntityProxy', () => {
    expect(Entity).toBeDefined()
    expect(Value).toBeDefined()
    expect(EntityProxy).toBeDefined()
  })
})
