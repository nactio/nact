/* eslint-env mocha */
/* eslint-disable no-unused-expressions */
var freeze = require('../lib/freeze');
require('chai').should();

describe('freeze', function () {
  let person = {};
  let expectedPerson = {};

  beforeEach(function () {
    person = {
      name: 'John',
      surname: 'Johnson',
      age: 26,
      address: {
        street: '1st Street',
        city: 'Los Angeles',
        country: 'USA'
      },
      vehicles: ['BMW', 'Ferrari', 'Lamborghini']
    };

    expectedPerson = {
      name: 'John',
      surname: 'Johnson',
      age: 26,
      address: {
        street: '1st Street',
        city: 'Los Angeles',
        country: 'USA'
      },
      vehicles: ['BMW', 'Ferrari', 'Lamborghini']
    };
  });

  it('should not override any object properties', function () {
    person = freeze(person);
    person.name = 'Jack';
    person.surname = 'Jackson';
    person.age = 18;
    person.address = {
      street: 'Third Street',
      city: 'San Francisco',
      country: 'USA'
    };
    person.vehicles = ['Toyota'];
    person.name = 'Jack';
    person.surname = 'Jackson';
    person.age = 18;
    person.address.street = 'Third Street';
    person.address.city = 'San Francisco';
    person.address.country = 'USA';
    person.vehicles[0] = 'Toyota';

    delete person.vehicles[1];
    delete person.vehicles[2];

    person.should.deep.equal(expectedPerson, 'any object properties should not be overridden');
  });

  it('should not add new properties to an object', function () {
    person = freeze(person);

    person.occupation = 'Lawyer';
    person.nickname = 'JJ';

    person.should.deep.equal(expectedPerson);
  });
});
