angular.module('BlocksApp').controller('TxController', function($stateParams, $rootScope, $scope, $http, $location) {
    $scope.$on('$viewContentLoaded', function() {   
        // initialize core components
        App.initAjax();
    });

    $rootScope.$state.current.data["pageSubTitle"] = $stateParams.hash;
    $scope.hash = $stateParams.hash;
    $scope.tx = {"hash": $scope.hash};

    //fetch web3 stuff
    $http({
      method: 'POST',
      url: '/web3relay',
      data: {"tx": $scope.hash}
    }).success(function(data) {
      $scope.tx = data;
      if (data.timestamp)
        $scope.tx.datetime = new Date(data.timestamp*1000); 
      if (data.isTrace) // Get internal txs
        fetchInternalTxs();
    });

    var fetchInternalTxs = function() {
      $http({
        method: 'POST',
        url: '/web3relay',
        data: {"tx_trace": $scope.hash}
      }).success(function(data) {
        $scope.internal_transactions = data;
      });      
    }
})
