angular.module('grammarkApp',['underscore','ngRoute'])

// Setting configuration for application
.config(function ($routeProvider) {
    $routeProvider.when('/overview', {
        controller: overviewCtrl,
        templateUrl: 'views/overview.html'
    });
    $routeProvider.when('/fix/:postId', {
        controller: individualCtrl,
        templateUrl: 'views/individual.html'
    });
    $routeProvider.when('/page/:postId', {
        controller: pageCtrl,
        templateUrl: 'views/page.html'
    });
    $routeProvider.otherwise({
        redirectTo: '/',
        templateUrl: 'views/front.html'
    });

})

.config(['$httpProvider', function ($httpProvider) {
        // enable http caching
       $httpProvider.defaults.cache = true;
}])

.controller ('formCtrl', function ($scope, $routeParams, cache, text) {
    $scope.submitForm = function() {
        cache.set('text', $scope.text);
        window.location.assign("#/overview");
    };
    $scope.resetForm = function() {
        cache.clearAll();
        window.location.assign("#/");
    };
    $scope.highlight = function() {
        text.highlight();
    }
})

.service('text', function (cache, type) {
    var current = '';
    var existing = '';
    var sanitized = '';
    var sentencecount = '';
    var wordcount = '';
    var matches = [];
    var matchIds = [];
    var find = [];
    var highlighted = '';
    var instances = 0;

    return {
        process: function () {
            this.raw = cache.get('text');
            var noSuggestions = String(this.raw).replace(/<div class="suggestion">(.*?)<\/div>/gi, '');
            this.sanitized = String(noSuggestions).replace(/<[^>]+>/gm, '');
            this.semicolonsAndPeriods = this.sanitized.replace(/[,\-\/#!$%\^&\*:{}=\-_`~()]/g,'');
            this.sentences = this.semicolonsAndPeriods.replace(/[;]/g,'.');
            this.sentenceCount = this.sentences.trim().split(/[\.]/g).length -1;
            this.noPunctuation = ' ' + this.sentences.replace(/[\.]/g,'').toLowerCase() + ' ';
            this.words = this.noPunctuation.trim().split(/\s+/);
            this.wordCount = this.words.length;
            var matches = []; // reset
            var count = 0;

    /*        console.log('raw: ' + this.raw);
            console.log('sanitized: ' + this.sanitized);
            console.log('semicolonsAndPeriods: ' + this.semicolonsAndPeriods);
            console.log('sentences: ' + this.sentences);
            console.log('sentence count: ' + this.sentenceCount);
            console.log('noPunctuation: ' + this.noPunctuation);
            console.log('words: ' + this.words);
            console.log('wordcount: ' + this.wordcount);
            console.log('matches:  ' + this.find);*/
            type.get();
            var corrections = type.data.corrections;
            for (var i in corrections) {
                var needle = i.replace(/[,\-\/#!$%\^&\*:{}=\-_`~();\.]/g,'');
                if (this.noPunctuation.indexOf(' ' + needle + ' ') !=-1) {
                    matches.push(i);
                    count++;
                }
                var uppercase = needle.substr(0, 1).toUpperCase() + needle.substr(1);
                if (this.noPunctuation.indexOf(' ' + uppercase + ' ') !=-1) {
                    matches.push(i);
                    count++;
                }
            }
            console.log('count' + count);
            this.instances = matches.length;
            this.matches = _.uniq(matches);
            var cachename = type.data.machineName + '_matches';
            cache.set(cachename, this.matches);
        },

        highlight: function () {
            type.get();
            //console.log('text-highlight' + this.matches);
            this.highlighted = this.sanitized;
            for (i = 0; i < this.matches.length; i++) {
                var match = this.matches[i];
                var suggestion = '';
                if (type.data.corrections[match] != '') {
                    var suggestion = '<div class="suggestion">' + type.data.corrections[match] + '</div>';
                }
                this.highlighted = this.highlighted.split(' ' + match + ' ').join(' <mark>' + match + suggestion + '</mark> ');
                this.highlighted = this.highlighted.split(' ' + match + '.').join(' <mark>' + match + suggestion + '</mark>.');
                this.highlighted = this.highlighted.split(' ' + match + ',').join(' <mark>' + match + suggestion + '</mark>,');
                var uppercase = match.substr(0, 1).toUpperCase() + match.substr(1);
                this.highlighted = this.highlighted.split(uppercase).join('<mark>' + uppercase + '</mark>');
            }
            return this.highlighted;
        },
    };
})

.service('cache', function() {
    var cache = [];
    cache.text = '';

    return {
        get: function (name) {
            return cache[name];
        },
        set: function (name, value) {
            cache[name] = value;
        },
        clear: function (name) {
            cache.name = [];
        },
        clearAll: function () {
            cache = [];
        },
        getAll: function() {
            return cache;
        }
    };
})

.service('score', function ($routeParams, type, text) {

    this.calculate = function() {
        var result = 0;
        switch (type.data.ratioType) {
            case 'errors':
                result = text.instances;
                break;
            case '% of sentences':
                result = (text.instances/text.sentenceCount)*100;
                break;
            case ' per sentence':
                result = (text.instances/text.sentenceCount);
                break;
            case '% of words':
                result = (text.instances/text.wordCount)*100;
                break;
        }
        return parseInt(result, 10);
    }
    this.grade = function() {
        var result = 'success'; // default
        switch (type.data.scoringType) {
        case 'punitive':
            if (this.calculate() > type.data.passingScore) {
                result = 'warning';
            }
            break;
        case 'positive':
            if (this.calculate() < type.data.passingScore) {
                result = 'warning';
            }
            break;
        }
        return result;
    }
})

.service('type', function ($routeParams) {
    var data = '';

    this.get = function() {
        switch ($routeParams.postId) {
        case 'passive':
            var data = new passive();
            break;
        case 'wordiness':
            var data = new wordiness();
            break;
        case 'grammar':
            var data = new grammar();
            break;
        case 'academic':
            var data = new academic();
            break;
        case 'transitions':
            var data = new transitions();
            break;
        case 'nominalizations':
            var data = new nominalizations();
            break;
        case 'sentences':
            var data = new sentences();
            break;
        }
        this.data = data;
        return data;
    }
})

.directive("contenteditable", function() {
  return {
    restrict: "A",
    require: "ngModel",
    link: function(scope, element, attrs, ngModel) {

      function read() {
        ngModel.$setViewValue(element.html());
      }

      ngModel.$render = function() {
        element.html(ngModel.$viewValue || "");
      };

      element.bind("blur keyup change", function() {
        scope.$apply(read);
      });
    }
  }
})

.filter('capitalize', function() {
  return function(input, all) {
    return (!!input) ? input.replace(/([^\W_]+[^\s-]*) */g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();}) : '';
  }
})