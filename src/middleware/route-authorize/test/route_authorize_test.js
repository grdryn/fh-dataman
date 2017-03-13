import assert from 'assert';
import authorize from '../';
import fhconfig from 'fh-config';

var user = null;
const mockRes = {};
var mockReq = null;
const appname = '12345678';

module.exports = {
  'Test Route Authorization Middleware': {
    'before': function(done) {
      fhconfig.init('config/dev.json', () => {
        user = {
          entity: {
            guid: appname
          },
          permissions: [{
            businessObject: fhconfig.value('businessObject'),
            permissions: {read: true}
          }]
        };
        mockReq = {
          user: user,
          params: {
            appname: appname
          }
        };
        done();
      });
    },

    'Route Passes Authorization': function(done) {
      const middleware = authorize({permission: 'read'});

      middleware(mockReq, mockRes, err => {
        assert.ok(!err);
        done();
      });
    },

    'Route fails Authorization': function(done) {
      const middleware = authorize({permission: 'write'});

      middleware(mockReq, mockRes, err => {
        assert.ok(err);
        done();
      });
    }
  }
};
