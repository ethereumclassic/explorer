angular.module('BlocksApp').controller('ContractController', function($stateParams, $rootScope, $scope, $http, $timeout) {
    $scope.$on('$viewContentLoaded', function() {   
        // initialize core components
        App.initAjax();
    });

    $rootScope.$state.current.data["pageSubTitle"] = $stateParams.addr;

    //fetch compiler options
    $http.get('COMPILERS.json')
       .then(function(res){
          $scope.compilerVersions = res.data;                
        });

    $scope.form = {};
    $scope.contract = {"address": $stateParams.addr} 

    $scope.submitCode = function() {
      console.log($scope.contract)
      // validate
      $scope.errors = {};
      if (!isAddress($scope.contract.address)) 
        $scope.errors.address = "Invalid Address";
      if ($scope.contract.name.length <2)
        $scope.errors.name = "Contract Name Required";
      if ($scope.contract.version == "undefined")
        $scope.errors.version = "Compiler Version Required"
      if ($scope.contract.code.length < 10)
        $scope.errors.code = "Invalid Contract Code"

      if (Object.keys($scope.errors) < 1) {
        // send to web3 for validation
        $http({
          method: 'POST',
          url: '/web3compile',
          data: $scope.contract
        }).success(function(data) {
          $scope.contract.bytecode = data;
        });
      }
      else
        return;
    }

})