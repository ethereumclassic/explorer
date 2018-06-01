angular.module('BlocksApp').controller('TxController', function($stateParams, $rootScope, $scope, $http, $location) {
    $scope.$on('$viewContentLoaded', function() {   
        // initialize core components
        App.initAjax();
    });

    $rootScope.$state.current.data["pageSubTitle"] = $stateParams.hash;
    $scope.hash = $stateParams.hash;
    $scope.tx = {"hash": $scope.hash};
    $scope.settings = $rootScope.setup;

    //fetch web3 stuff
    $http({
      method: 'POST',
      url: '/web3relay',
      data: {"tx": $scope.hash}
    }).then(function(resp) {
      if (resp.data.error) {
        if (resp.data.isBlock) {
          // this is a blockHash
          $location.path("/block/" + $scope.hash);
          return;
        }
        $location.path("/err404/tx/" + $scope.hash);
        return;
      }
      $scope.tx = resp.data;
      if (resp.data.timestamp)
        $scope.tx.datetime = new Date(resp.data.timestamp*1000); 
      if (resp.data.isTrace) // Get internal txs
        fetchInternalTxs();
    });

    var fetchInternalTxs = function() {
      $http({
        method: 'POST',
        url: '/web3relay',
        data: {"tx_trace": $scope.hash}
      }).then(function(resp) {
        $scope.internal_transactions = resp.data;
      });      
    }
})
