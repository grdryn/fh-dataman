/* eslint-disable no-console */
import assert from 'assert';
import supertest from 'supertest';
import express from 'express';
import sinon from 'sinon';
import * as createImpl from './create';
import * as listImpl from './list';
import * as deleteImpl from './delete';
import {collectionsHandler} from './index';
import {getLogger} from '../../../logger';
import bodyParser from 'body-parser';
import errorHandler from '../error';
import sinonStubPromise from 'sinon-stub-promise';
import statusCodes from 'http-status-codes';
import fhconfig from 'fh-config';

sinonStubPromise(sinon);
const app = express();
const router = express.Router({mergeParams:true});
const logger = getLogger();
var user = null;
const appGuid = '123456';

collectionsHandler(router);
const dropCollecionStub = sinon.stub().returnsPromise();
app.use(bodyParser.json());
app.use((req, res, next) => {
  req.log = logger;
  req.db = {
    dropCollection: dropCollecionStub
  };
  req.user = user;
  next();
});
app.use('/api/:appGuid/', router);
app.use(errorHandler);

module.exports = {
  'test collection handlers': {
    'before': function(done) {
      sinon.stub(listImpl, 'default', function() {
        console.log('use mock listImpl');
        return Promise.resolve([{'ns':'test.test1', 'name':'test1', 'count': 1, 'size': 100}, {'ns':'test.test2', 'name':'test2', 'count': 1, 'size': 100}]);
      });
      sinon.stub(deleteImpl, 'default', () => {
        console.log('use mock deleteImpl');
        return Promise.resolve([{'name': 'collection1'}, {'name': 'collection2'}]);
      });
      sinon.stub(createImpl, 'default', () => {
        console.log('use mock createImpl');
        return Promise.resolve(true);
      });
      dropCollecionStub.resolves('collection1,collection2 collection(s) deleted');
      fhconfig.init('config/dev.json', () => {
        user = {
          entity: {
            guid: appGuid
          },
          permissions: [{
            businessObject: fhconfig.value('businessObject'),
            permissions: {read: true, write: true}
          }]
        };
        done();
      });
    },
    'after': function(done) {
      sinon.restore();
      done();
    },
    'test list handler': function(done) {
      supertest(app)
        .get(`/api/${appGuid}/collections`)
        .expect(statusCodes.OK)
        .end(done);
    },
    'test delete handler': () => {
      supertest(app)
        .delete(`/api/${appGuid}/collections/names=collection1,collection2`)
        .expect(statusCodes.OK)
        .then(function(res) {
          assert.equal(res.text, '"collection1,collection2 collection(s) deleted"');
        });
    },
    'test delete handler names of collections required': done => {
      supertest(app)
        .delete(`/api/${appGuid}/collections?`)
        .expect(statusCodes.BAD_REQUEST)
        .end(done);
    },
    'test create handler': () => {
      supertest(app)
        .post(`/api/${appGuid}/collections`)
        .send({name: 'testCollection'})
        .expect(statusCodes.CREATED)
        .then(function(res) {
          assert.equal(res.text, 'testCollection collection deleted');
        });
    },
    'test create handler name required': done => {
      supertest(app)
        .post(`/api/${appGuid}/collections`)
        .expect(statusCodes.BAD_REQUEST)
        .end(done);
    }
  }
};
