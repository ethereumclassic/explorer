angular.module('BlocksApp').controller('UncleController', function($stateParams, $rootScope, $scope, $http, $location) {
    $scope.$on('$viewContentLoaded', function() {
        // initialize core components
        App.initAjax();
        //TableAjax.init();
    });

    var tmp = $stateParams.number.split('/');
    $scope.blockNum = tmp[0];
    $scope.uncleIndex = parseInt(tmp[1]) || 0;
    $rootScope.$state.current.data["pageSubTitle"] = $scope.blockNum + ' (Index: ' + $scope.uncleIndex + ')';
    $scope.settings = $rootScope.setup;

    //fetch transactions
    $http({
      method: 'POST',
      url: '/web3relay',
      data: {"uncle": $stateParams.number}
    }).success(function(data) {
      if (data.error)
        $location.path("/err404/uncle/" + $stateParams.number);
      else {
        $scope.block = data;
        $scope.block.datetime = new Date(data.timestamp*1000);
      }
    });
})
