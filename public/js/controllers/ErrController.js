angular.module('BlocksApp').controller('ErrController', function($stateParams, $rootScope, $scope) {

    $rootScope.$state.current.data["pageSubTitle"] = $stateParams.hash;
    $scope.thing = $stateParams.thing;
    $scope.settings = $rootScope.setup;

})