angular.module('BlocksApp').controller('ContractController', function($stateParams, $rootScope, $scope, $http, $timeout) {
    $scope.$on('$viewContentLoaded', function() {   
        // initialize core components
        App.initAjax();
    });

    $rootScope.$state.current.data["pageSubTitle"] = $stateParams.addr;
    $scope.addrHash = $stateParams.addr;
    $scope.contract = {};

    //fetch web3 stuff
    $http({
      method: 'POST',
      url: '/web3relay',
      data: {"addr": $scope.addrHash, "options": ["bytecode"]}
    }).success(function(data) {
      $scope.contract = data;
    });

})