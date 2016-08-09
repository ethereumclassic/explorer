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
      }).success(function(data) {
        $scope.blockLoading = false;
        $scope.latest_blocks = data.blocks;
      });
    }
    

    $scope.reloadTransactions = function() {
      $scope.txLoading = true;
      $http({
        method: 'POST',
        url: URL,
        data: {"action": "latest_txs"}
      }).success(function(data) {
        $scope.latest_txs = data.txs;
        $scope.txLoading = false;
      });  
    }

    $scope.reloadBlocks();
    $scope.reloadTransactions();
    $scope.txLoading = false;
    $scope.blockLoading = false;
})
.directive('summaryStats', function($http) {
  return {
    restrict: 'E',
    templateUrl: '/views/summary-stats.html',
    scope: true,
    link: function(scope, elem, attrs){
      scope.stats = {};
        //fetch stats stuff 
        // TODO (Elaine): use our own API
        var statsURL = "http://cors.io/?u=http://ec2-52-42-175-9.us-west-2.compute.amazonaws.com/api/eth.json";
        $http.get(statsURL)
         .then(function(res){
            console.log(res.data)
            scope.stats = {
              "usdEtc": res.data[0].substr(1,res.data[0].length),
              "usdEth": res.data[10].substr(1,res.data[0].length),
              "etcHashrate": res.data[9]
            };
            scope.stats.usdEtcEth = parseInt(100*parseFloat(scope.stats.usdEtc)/parseFloat(scope.stats.usdEth));
            scope.stats.etcEthHash = parseInt(parseFloat(res.data[9])/(10*parseFloat(res.data[19])));
            scope.stats.ethChange = parseFloat(res.data[13].substr(2, res.data[13].length))
          });
          
        }
  }
})