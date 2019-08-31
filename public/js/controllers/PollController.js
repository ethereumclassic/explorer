var FETCH_DELAY = 3000;

angular
  .module('BlocksApp')
  .controller('PollController', function($rootScope, $scope, $http, $timeout) {
    var type = Number($scope.$state.current.name === 'blacklists');
    var timeout;    
    var setNowTimeout;

    $scope.votesRequired = 24;
    $scope.millisecondsToWords = function(milliseconds, zero = '0s') {
      if (milliseconds <= 0) {
        return zero;
      }
      const hours = Math.floor(milliseconds / 1000 / 3600);
      milliseconds = (milliseconds / 1000) % 3600;
      const minutes = Math.floor(milliseconds / 60);
      const seconds = Math.floor(milliseconds % 60);
      if (hours > 0) {
        return hours + 'h ' + minutes + 'm ' + seconds + 's';
      } else if (minutes > 0) {
        return minutes + 'm ' + seconds + 's';
      }
      return seconds + 's';
    };

    $scope.addressToSrcIcon = function(address) {
      try {
        var options = {          
          margin: 0.1,
          size: 60,
          format: 'svg'
        };    
        var data = new window.Identicon(address, options).toString();
        return 'data:image/svg+xml;base64,' + data;
      } catch (err) {  
        return null;
      }
    }
    
    function loadPolls() {
      return $http({
        method: 'GET',
        url: `/polls?type=${type}`        
      }).then(function (resp) {
        $scope.polls = resp.data.polls;
        $scope.nodes = resp.data.nodes;
      })
    }    

    function setNow() {
      $scope.now = Date.now();
      setNowTimeout = $timeout(setNow, 100);
    }
    
    function startTimeout() {
      cancelTimeout();
      loadPolls().then(
        timeout = $timeout(startTimeout, FETCH_DELAY)
      );
    }
    function cancelTimeout() {
      $timeout.cancel(timeout);
      timeout = undefined;
    }

    setNow();
    startTimeout();
    $scope.$on('$destroy', function() {
      cancelTimeout();
      $timeout.cancel(setNowTimeout);
      setNowTimeout = undefined;
    });
  });
