var FETCH_DELAY = 3000;

angular.module('BlocksApp')
  .controller('HomeController', function ($rootScope, $scope, $http, $timeout) {
    $scope.$on('$viewContentLoaded', function () {
      // initialize core components
      App.initAjax();
    });
    
    var URL = '/data';
    var timeout;
    
    $rootScope.isHome = true;
    
    $scope.reloadBlocks = function () {
      $scope.blockLoading = true;
      return $http({
        method: 'POST',
        url: URL,
        data: { 'action': 'latest_blocks' },
      })
        .then(function (resp) {
          $scope.latest_blocks = resp.data.blocks;
          $scope.blockLoading = false;
        });
    };
    
    $scope.reloadTransactions = function () {
      $scope.txLoading = true;
      return $http({
        method: 'POST',
        url: URL,
        data: { 'action': 'latest_txs' },
      })
        .then(function (resp) {
          $scope.latest_txs = resp.data.txs;
          $scope.txLoading = false;
        });
    };
  
    function reloadBoth() {
      return Promise.all([$scope.reloadBlocks(), $scope.reloadTransactions()]);
    }
    function startTimeout() {
      cancelTimeout();
      reloadBoth().then(
        timeout = $timeout(startTimeout, FETCH_DELAY)
      );
    }
    function cancelTimeout() {
      $timeout.cancel(timeout);
      timeout = undefined;
    }
    
    startTimeout();
    $scope.txLoading = false;
    $scope.blockLoading = false;
    $scope.settings = $rootScope.setup;
    $scope.$on('$destroy', cancelTimeout);
  })
  .directive('simpleSummaryStats', function ($http, $timeout) {
    return {
      restrict: 'E',
      templateUrl: '/views/simple-summary-stats.html',
      scope: true,
      link: function (scope, elem, attrs) {
        scope.stats = {};
        var statsURL = '/web3relay';
        var timeout;
        function getData() {
          return $http.post(statsURL, { 'action': 'hashrate' })
            .then(function (res) {
              // scope.stats.hashrate = res.data.hashrate;
              // scope.stats.difficulty = res.data.difficulty;
              scope.stats.blockHeight = res.data.blockHeight;
              scope.stats.blockTime = res.data.blockTime;
              //console.log(res);
            });
        }
        function startTimeout() {
          getData().then(function() {
            timeout = $timeout(startTimeout, FETCH_DELAY);
          });
        }
        
        startTimeout();
        scope.$on('$destroy', function() {
          $timeout.cancel(timeout);
          timeout = undefined;
        })
      },
    };
  })
  .directive('siteNotes', function () {
    return {
      restrict: 'E',
      templateUrl: '/views/site-notes.html',
    };
  });
