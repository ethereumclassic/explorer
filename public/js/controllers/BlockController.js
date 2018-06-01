angular.module('BlocksApp').controller('BlockController', function($stateParams, $rootScope, $scope, $http, $location) {
    $scope.$on('$viewContentLoaded', function() {   
        // initialize core components
        App.initAjax();
        //TableAjax.init();
    });

    $rootScope.$state.current.data["pageSubTitle"] = $stateParams.number;
    $scope.blockNum = $stateParams.number;
    $scope.settings = $rootScope.setup;

    //fetch transactions
    $http({
      method: 'POST',
      url: '/web3relay',
      data: {"block": $scope.blockNum}
    }).then(function(resp) {
      if (resp.data.error)
        $location.path("/err404/block/" + $scope.blockNum);
      else {
        $scope.block = resp.data;
        $scope.block.datetime = new Date(resp.data.timestamp*1000); 
      }
    });
})