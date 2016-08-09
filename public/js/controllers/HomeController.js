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

          scope.stats.usdEtc = res.data[0].substr(1,res.data[0].length);
          scope.stats.usdEth = res.data[10].substr(1,res.data[0].length);
          scope.stats.etcHashrate = res.data[9];

          scope.stats.usdEtcEth = parseInt(100*parseFloat(scope.stats.usdEtc)/parseFloat(scope.stats.usdEth));
          scope.stats.etcEthHash = parseInt(parseFloat(res.data[9])/(10*parseFloat(res.data[19])));
          scope.stats.ethChange = parseFloat(res.data[13].substr(2, res.data[13].length))
        });
          //get eth stuff
       var ethURL = "https://api.etherscan.io/api?module=proxy&action=eth_getBlockByNumber&tag=latest&boolean=true&apikey=9MJJ3W4RR5XWSM2YDJ3VCI98QA8XVWCQWC"
      $http.get(ethURL)
       .then(function(res){
          try {
            scope.stats.ethDiff = parseInt(res.data.result.totalDifficulty);
            scope.stats.etcEthDiff = 100*parseInt(scope.stats.etcDiff/scope.stats.ethDiff);
          } catch (e) {
            console.error(e);
            scope.stats.ethDiff = 1;
          }

        });

        $http.get("/latestblock")
         .then(function(res){
          try {
            scope.stats.etcDiff = parseInt(res.data.totalDifficulty);
            scope.stats.etcEthDiff = 100*parseInt(scope.stats.etcDiff/scope.stats.ethDiff);
          } catch (e) {
            console.error(e);
            scope.stats.etcDiff = 1;
          }

        });       

      }
  }
})


angular.module('BlocksApp')
.filter('timeDuration', function() {
  return function(timestamp) {
    return getDuration(timestamp).toString();
  };
})
.filter('totalDifficulty', function() {
  return function(hashes) {
    return getDifficulty(hashes);
  };
})