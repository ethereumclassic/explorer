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

      // TODO (Elaine): use our own API
      var ethURL = "http://cors.io/?u=https://api.minergate.com/1.0/eth/status";
      var etcURL = "http://cors.io/?u=https://api.minergate.com/1.0/etc/status";
      var etcPriceURL = "https://coinmarketcap-nexuist.rhcloud.com/api/etc";
      var ethPriceURL = "https://coinmarketcap-nexuist.rhcloud.com/api/eth"
      scope.stats.ethDiff = 1;
      scope.stats.ethHashrate = 1;
      scope.stats.usdEth = 1;


      
      $http.get(ethURL)
       .then(function(res){
          scope.stats.ethHashrate = parseInt(res.data.instantHashrate);
          scope.stats.etcEthHash = parseInt(100*scope.stats.etcHashrate/scope.stats.ethHashrate);

          scope.stats.ethDiff = res.data.difficulty.toFixed(2);
          scope.stats.etcEthDiff = parseInt(100*scope.stats.etcDiff/scope.stats.ethDiff);
        });
      $http.get(etcURL)
       .then(function(res){
          scope.stats.etcHashrate = parseInt(res.data.instantHashrate);
          scope.stats.etcEthHash = parseInt(100*scope.stats.etcHashrate/scope.stats.ethHashrate);

          scope.stats.etcDiff = res.data.difficulty.toFixed(2);
          scope.stats.etcEthDiff = parseInt(100*scope.stats.etcDiff/scope.stats.ethDiff);
        });
      $http.get(etcPriceURL)
       .then(function(res){
          scope.stats.usdEtc = res.data.price["usd"].toFixed(2);
          scope.stats.usdEtcEth = parseInt(100*scope.stats.usdEtc/scope.stats.usdEth);
        });
      $http.get(ethPriceURL)
       .then(function(res){
          scope.stats.usdEth = res.data.price["usd"].toFixed(2);
          scope.stats.usdEtcEth = parseInt(100*scope.stats.usdEtc/scope.stats.usdEth);
          scope.stats.ethChange = parseFloat(res.data.change);
        });

      }
  }
});

// Create the XHR object.
function createCORSRequest(method, url) {
  var xhr = new XMLHttpRequest();
  if ("withCredentials" in xhr) {
    // XHR for Chrome/Firefox/Opera/Safari.
    xhr.open(method, url, true);
  } else if (typeof XDomainRequest != "undefined") {
    // XDomainRequest for IE.
    xhr = new XDomainRequest();
    xhr.open(method, url);
  } else {
    // CORS not supported.
    xhr = null;
  }
  return xhr;
}


