var config = require('./../config/config.json');
var API = function () {
  
};

API.prototype.validateIP = function (input) {
  var regexp = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

  return regexp.test(input);
}

API.prototype.parseURL = function (url) {
  var urlMatch = url.match(/<(?:http:\/\/|https:\/\/)([^\ \|>]+)\|[^\ \|>]+>/);

  if (urlMatch) {
    return urlMatch[1];
  }

  return url;
};

API.prototype.findDomain = function (host) {
  var parts = host.split('.');
  var numParts = parts.length;

  if (numParts < 3) {
    return;
  }

  var domain = parts[numParts - 2] + '.' + parts[numParts - 1];

  if (config.domains[domain]) {
    return config.domains[domain];
  }
}

API.prototype.addRecord = function (text, value, content) {
  var parsedValue = this.parseURL(value);
  var parsedContent = this.parseURL(content);
  var domain = this.findDomain(parsedValue);

  if (!domain) {
    return Promise.reject({
      success: false,
      errorCode: 'ERR_INVALID_SOURCE',
      domain: parsedValue
    });
  }

  var providerConfig = config.providers[domain.provider];
  var provider = providerConfig && require('./../providers/' + domain.provider)(providerConfig, domain);
  var type = this.validateIP(parsedContent) ? 'A' : 'CNAME';

  return provider.create(type, parsedValue, parsedContent).then((response) => {
    var message = ':tada: Done! I\'ve created a *' + response.type + '* record pointing *' + response.name + '* to *' + response.content + '*.';

    return {
      success: true,
      message: message
    };
  });
};

API.prototype.queryRecord = function (query) {
  query = this.parseURL(query);

  var domain = this.findDomain(query);

  if (!domain) {
    return Promise.reject({
      success: false,
      errorCode: 'ERR_INVALID_SOURCE',
      domain: query
    });
  }

  var providerConfig = config.providers[domain.provider];
  var provider = providerConfig && require('./../providers/' + domain.provider)(providerConfig, domain);
  var queryParameters = {};

  return provider.list(null, {name: query}).then((response) => {
    var message = response.length ? 'I can tell you that *' + response[0].name + '* is a *' + response[0].type + '* record pointing to *' + response[0].content + '*.' : 'Hmmm, that record doesn\'t seem to exist...'
    
    return {
      success: true,
      message: message
    }
  });
}

module.exports = new API();
