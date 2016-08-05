angular.module('BlocksApp').controller('AddressController', function($stateParams, $rootScope, $scope, $http, $timeout) {
    $scope.$on('$viewContentLoaded', function() {   
        // initialize core components
        App.initAjax();
        //TableAjax.init();
    });

    $rootScope.$state.current.data["pageSubTitle"] = $stateParams.hash;
    $scope.addrHash = $stateParams.hash;
    $scope.addr = {"balance": 0, "count": 0};

    //fetch web3 stuff
    $http({
      method: 'POST',
      url: '/web3relay',
      data: {"addr": $scope.addrHash}
    }).success(function(data) {
      console.log(data);
      $scope.addr = data;
    });

    //fetch transactions
    $http({
      method: 'POST',
      url: '/addr',
      data: {"addr": $scope.addrHash}
    }).success(function(data) {
      $("#table_txs").DataTable({
        "data": data,
        "lengthMenu": [
                    [10, 20, 50, 100, 150, -1],
                    [10, 20, 50, 100, 150, "All"] // change per page values here
                ],
        "pageLength": 10, 
        "order": [
            [6, "desc"]
        ],
        "language": {
          "lengthMenu": "_MENU_ transactions",
          "zeroRecords": "No transactions found",
          "infoEmpty": ":(",
          "infoFiltered": "(filtered from _MAX_ total txs)",
          "loadingRecords": '<img src="/img/loading.gif">',
          "processing":     '<img src="/img/loading.gif">',
          "loading": true,
          "processing": true
        },
        "columnDefs": [ 
          {"type": "date", "targets": 6},
          {"orderable": false, "targets": [0,2,3]},
          { "render": function(data, type, row) {
                        if (data != $scope.addrHash)
                          return '<a href="/addr/'+data+'">'+data+'</a>'
                        else
                          return data
                      }, "targets": [2,3]},
          { "render": function(data, type, row) {
                        return '<a href="/block/'+data+'">'+data+'</a>'
                      }, "targets": [1]},
          { "render": function(data, type, row) {
                        return '<a href="/tx/'+data+'">'+data+'</a>'
                      }, "targets": [0]},
          ]
      })
    });


})