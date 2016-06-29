var api = require('./lib/api');
var config = require('./config/config.json');

var RtmClient = require('@slack/client').RtmClient;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;
var CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;

var token = process.env.SLACK_API_TOKEN || config.slack.apiKey;

// ---------------------
var userId;
var listenExp;
// ---------------------

var rtm = new RtmClient(token);
rtm.start();

rtm.on(RTM_EVENTS.MESSAGE, function handleRtmMessage(message) {
  var listen = listenExp && message.text && message.text.match(listenExp);

  if (listen) {
    var text = listen[1];

    for (var i = 0, numExpressions = expressions.length; i < numExpressions; i++) {
      var regexp = new RegExp(expressions[i].match);
      var expressionMatch = text.match(regexp);

      if (expressionMatch && (typeof expressions[i].fn === 'function')) {
        expressions[i].fn.apply(api, expressionMatch).then((response) => {
          sendbackMessage(response, message);
        }).catch((error) => {
          sendbackMessage(error, message);  
        });

        break;
      }
    }
  }
});

rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, (rtmStartData) => {
  userId = rtmStartData.self.id;

  listenExp = new RegExp('<@' + userId + '>(?:\:){0,1}(?:\ )+(.*)');
});

var expressions = [
  {
    match: '(?:point|redirect)(?:\ +)([^\ ]+)(?:\ +)(?:to|at)(?:\ +)([^\ ]+)',
    fn: api.addRecord
  },
  {
    match: 'what\ is\ ([^\?]+)',
    fn: api.queryRecord
  }
];

function sendbackMessage(response, originalEvent, successMessage) {
  var output = response.success ? (response.message || 'Done! :tada:') : getErrorMessage(response);

  if (output) {
    rtm.sendMessage(output, originalEvent.channel);
  }
}

function getErrorMessage(error) {
  var message;

  switch (error.errorCode) {
    case 'ERR_INVALID_SOURCE':
      message = 'Oops! *' + error.domain + '* is not a domain I can create. Sorry about that.';

      break;

    case 'ERR_INVALID_CONTENT':
      message = 'Erm, the value *' + error.content + '* doesn\'t seem to be valid.';

      break;

    case 'ERR_NAME_EXISTS':
      message = 'The name *' + error.name + '* is already being used.';

      break; 

    case 'ERR_UNKNOWN':
    default:
      message = 'Erm, something went wrong and I can\'t tell you for sure what is was.';

      if (error.message) {
        message += ' All I know is: _' + error.message + '_'
      }

      break;
  }

  return message;
}
