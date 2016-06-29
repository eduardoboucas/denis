var request = require('request-promise')
var querystring = require('querystring')

var CloudFlare = function (providerConfig, domainConfig) {
  this.provider = providerConfig;
  this.domain = domainConfig;
}

CloudFlare.prototype._request = function (verb, endpoint, data) {
  var requestOptions = {
    method: verb,
    uri: 'https://api.cloudflare.com/client/v4/' + endpoint,
    json: true,
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Email': this.provider.email,
      'X-Auth-Key': this.provider.key
    }
  };

  if (data) {
    requestOptions.body = data;
  }

  return request(requestOptions);
};

CloudFlare.prototype.list = function (types, parameters) {
  if (typeof types === 'string') {
    types = [types];
  }

  var url = 'zones/' + this.domain.zone + '/dns_records';

  if (parametersStr = querystring.stringify(parameters, {strict: false})) {
    url += '?' + parametersStr
  }

  return this._request('GET', url).then((response) => {
    var results = [];

    if (response.success) {
      response.result.forEach((result) => {
        if (!types || (types.indexOf(result.type) !== -1)) {
          results.push({
            content: result.content,
            name: result.name,
            type: result.type
          });          
        }
      });
    }

    return results;
  });
};

CloudFlare.prototype.create = function (type, name, content) {
  return this._request('POST', 'zones/' + this.domain.zone + '/dns_records', {
    content: content,
    name: name,
    type: type
  }).then((response) => {
    return this.handleResponse(null, response);
  }).catch((error) => {
    return this.handleResponse(error);
  });
};

CloudFlare.prototype.handleResponse = function (error, response) {
  if (error) {
    var output = {
      success: false
    };

    switch (error.error.errors[0].code) {
      case 1004:
        output.errorCode = 'ERR_INVALID_CONTENT';
        output.content = error.options.body.content;

        break;

      case 81053:
      case 81057:
        output.errorCode = 'ERR_NAME_EXISTS';
        output.name = error.options.body.name;

        break;

      default:
        output.errorCode = 'ERR_UNKNOWN';
        output.message = error.error.errors[0].message
    }

    return output;
  }

  return {
    success: true,
    name: response.result.name,
    content: response.result.content,
    type: response.result.type
  };  
};

module.exports = (function (providerConfig, domainConfig) {
  return new CloudFlare(providerConfig, domainConfig);
});
