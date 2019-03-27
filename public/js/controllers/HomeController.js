angular.module('BlocksApp').controller('HomeController', function($rootScope, $scope, $http, $timeout) {
    $scope.$on('$viewContentLoaded', function() {
        // initialize core components
        App.initAjax();
    });

    var URL = '/data';

    $rootScope.isHome = true;

    $scope.reloadBlocks = function() {
      $scope.blockLoading = true;
      $http({
        method: 'POST',
        url: URL,
        data: {"action": "latest_blocks"}
      }).then(function(resp) {
        $scope.latest_blocks = resp.data.blocks;
        $scope.blockLoading = false;
      });
    }
    $scope.reloadTransactions = function() {
      $scope.txLoading = true;
      $http({
        method: 'POST',
        url: URL,
        data: {"action": "latest_txs"}
      }).then(function(resp) {
        $scope.latest_txs = resp.data.txs;
        $scope.txLoading = false;
      });
    }
    $scope.reloadBlocks();
    $scope.reloadTransactions();
    $scope.txLoading = false;
    $scope.blockLoading = false;
    $scope.settings = $rootScope.setup;
})
.directive('simpleSummaryStats', function($http) {
  return {
    restrict: 'E',
    templateUrl: '/views/simple-summary-stats.html',
    scope: true,
    link: function(scope, elem, attrs){
      scope.stats = {};
      var statsURL = "/web3relay";
      $http.post(statsURL, {"action": "hashrate"})
       .then(function(res){
          scope.stats.hashrate = res.data.hashrate;
          scope.stats.difficulty = res.data.difficulty;
          scope.stats.blockHeight = res.data.blockHeight;
          scope.stats.blockTime = res.data.blockTime;
          //console.log(res);
	});
      }
  }
})
.directive('siteNotes', function() {
  return {
    restrict: 'E',
    templateUrl: '/views/site-notes.html'
  }
});
