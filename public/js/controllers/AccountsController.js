angular.module('BlocksApp').controller('AccountsController', function($stateParams, $rootScope, $scope, $http, $filter) {
  $scope.settings = $rootScope.setup;

  // fetch accounts
  var getAccounts = function() {
    $("#table_accounts").DataTable({
      processing: true,
      serverSide: true,
      paging: true,
      ajax: function(data, callback, settings) {
        // get totalSupply only once.
        data.totalSupply = $scope.totalSupply || -1;
        data.recordsTotal = $scope.totalAccounts || 0;
        $http.post('/richlist', data).then(function(resp) {
          // set the totalSupply
          if (resp.data.totalSupply) {
            $scope.totalSupply = resp.data.totalSupply;
          }
          // set the number of total accounts
          $scope.totalAccounts = resp.data.recordsTotal;

          // fixup data to show percentages
          var newdata = resp.data.data.map(function(item) {
            var num = item[0];
            var addr = item[1];
            var type = item[2];
            var balance = item[3];
            var lastmod = item[4];
            return [num, addr, type, balance, (balance / $scope.totalSupply) * 100, lastmod];
          });
          resp.data.data = newdata;
          callback(resp.data);
        });
      },
      lengthMenu: [
        [20, 50, 100, 150, 200, 500],
        [20, 50, 100, 150, 200, 500] // change per page values here
      ],
      pageLength: 20,
      order: [
        [3, "desc"]
      ],
      language: {
        lengthMenu: "_MENU_ accounts",
        zeroRecords: "No accounts found",
        infoEmpty: "",
        infoFiltered: "(filtered from _MAX_ total accounts)"
      },
      columnDefs: [
        { orderable: false, "targets": [0,1,4] },
        {
          render:
            function(data, type, row) {
              return '<a href="/addr/' + data +'">' + data + '</a>'
            },
          targets: [1]
        },
        {
          render:
            function(data, type, row) {
              if (data & 0x1) {
                return "Contract";
              }
              if (data & 0x4) { // user defined account type
                var accountType = data >> 3;
                accountType = accountType.toString();
                if ($scope.settings.accountTypes && $scope.settings.accountTypes[accountType]) {
                  return $scope.settings.accountTypes[accountType];
                }
                return "Genesis Alloc";
              }
              return "Account";
            },
          targets: [2]
        },
        {
          render:
            function(data, type, row) {
              return $filter('number')(data, 8);
            },
          targets: [3]
        },
        {
          render:
            function(data, type, row) {
              return $filter('number')(data, 4) + ' %';
            },
          targets: [4]
        }
      ]
    });
  };

  getAccounts();
});
