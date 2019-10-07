var FETCH_DELAY = 3000;

angular
  .module('BlocksApp')
  .controller('PollController', function($rootScope, $scope, $http, $timeout) {
    var isBlacklists = $scope.$state.current.name === 'blacklists'; 
    var type = Number(isBlacklists);
    var timeout;    
    var setNowTimeout;

    $scope.votesRequired = isBlacklists ? 3 : 24;
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

    $scope.showModal = false;
    $scope.modalDataLoading = true;
    $scope.modalAddress = null;
    $scope.toggleModal = function(address, isPoll) {      
      isPoll = isPoll !== undefined ? isPoll : false; 
      $scope.showModal = !$scope.showModal;
      if ($scope.showModal) {
        $scope.modalDataLoading = true;
        $http({
          method: 'GET',
          url: '/votes-list?type='+ type + '&address=' + address + '&poll=' + (isPoll ? 1 : 0),
        }).then(function (resp) {
          $scope.modalDataLoading = false;
          $scope.modalData = resp.data;
        })
      } else {
        $scope.modalData = null;
      }      
    }

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
  })
  .directive('votersList', function($http) {
    return {
      restrict: 'E',
      templateUrl: '/views/votersList.html',
      transclude: true,
      replace:true,
      scope:true,
      link: function(scope, element, attrs){
        console.log(attrs, element);
        scope.$watch(attrs.visible, function(value){
          if(value == true) {
            $(element).modal('show');
          } else {
            $(element).modal('hide');
          }
        });
        $(element).on('shown.bs.modal', function(){
          scope.$apply(function(){
            scope.$parent[attrs.visible] = true;
          });
        });
        $(element).on('hidden.bs.modal', function(){
          scope.$apply(function(){
            scope.$parent[attrs.visible] = false;
          });
        });
      }
    }
  });
