// Empty JS for your own code to be here
var contractAddress;
var ContractInstance;
var contract;
var UserCount = 0;
var loggeduser;
var loggedUserAddress;
var CurrentEitherPrice;

$.getJSON('https://api.coinmarketcap.com/v1/ticker/ethereum/', function(data) {
    CurrentEitherPrice = data[0].price_usd;
});
$.getJSON('contract/SwearJar.json', function(data) {
    // Is there an injected web3 instance?
    if (typeof web3 !== 'undefined') {
        web3Provider = web3.currentProvider;
        web3 = new Web3(web3Provider);
        var contract = web3.eth.contract(data);
        //Auto connect if we have a contract address in browser
        if (localStorage.getItem("contractAddress") && localStorage.getItem("contractAddress") != "null") {
            contractAddress = localStorage.getItem("contractAddress");
            InitContract(contract)
        } else {
            $(".connect-nav").fadeIn();
        }
    } else {
        $(".no-blockchain").fadeIn();

    }


    $("#fine-value").keypress(function() {
        $("#dol-val").text(getEitherUSD($(this).val()))
            // console.log();
    });

    $("#fine-value").change(function() {
        $("#dol-val").text(getEitherUSD($(this).val()))
            // console.log();
    });
    $("#modal-227670").click(function() {
        $("#dol-val").text(getEitherUSD($("#fine-value").val()))
            // console.log();
    });

    $("#deploy-btn").click(function() {
        userName = $("#fname").val();
        FineValue = $("#fine-value").val();
        DeployContract(bytecode, contract, userName, web3.toWei(FineValue));
        $(".deploy-form").fadeOut();
        $(".loading").fadeIn();
        $(this).fadeOut();
    });

    $("#connect-btn,#continue-btn").click(function() {
        if (!contractAddress)
            contractAddress = $("#caddress").val();
        localStorage.setItem("contractAddress", contractAddress);
        InitContract(contract);
        $('#modal-container-227671').modal('hide');
        $('#modal-container-227670').modal('hide');
    });

    $("#addUser-btn").click(function() {
        uname = $("#uname").val();
        uaddress = $("#uaddress").val();
        Adduser(uname, uaddress)
        $('#modal-container-user-add').modal('hide');
    });

    $(document).on("click", "#modal-user-fines", function() {
        $("#owns").html($(this).find(".user-balance").html());
        $("#uname-large").html($(this).find(".name").html());
        $("#currentuser").val($(this).find(".uid").html());
        $("#large-avatar").attr("src", $(this).find("img").attr("src"));
    });

    $(document).on("click", "#fine-user-btn", function() {
        FineUser($("#currentuser").val(), $("#large-fineuser").val());
    });

    $(document).on("click", "#withdraw-btn", function() {
        withDrawFunds($("#withdraw-amount").val(), $("#withdraw-payto").val());
    });

    $(document).on("click", "#fines-pay", function() {
        payAllMyFines($("#current-owned-wei").html(), loggeduser)
    });

    $(document).on("click", "#log-out", function() {
        localStorage.setItem("contractAddress", null);
        location.reload();
    });

    $(document).on("click", "#modal-payFine", function() {
        ContractInstance.getUserFinesTotal.call(loggeduser, (error, result) => {

            var userBalance = result.c[0];
            if (!error) {
                ContractInstance.FineValue.call((error, result) => {
                    if (!error) {

                        eitherOwed = web3.fromWei(userBalance * result.toNumber(), 'ether');

                        $("#current-owned").html(userBalance)
                        $("#current-owned-wei").html(userBalance * result.toNumber())
                        $("#current-owned-either").html(eitherOwed)
                        $("#current-owned-dol-val").text(getEitherUSD(eitherOwed))
                    } else {
                        console.log(error)
                    }
                });

            } else {
                console.log(error)
            }
        });
    });


});


function InitContract(contract) {
    web3.currentProvider.publicConfigStore.on('update', function(result) {
        if (loggedUserAddress != result.selectedAddress)
            getLoggedUser();
    });

    ContractInstance = contract.at(contractAddress);
    SwitchPage("#page1", "#page2")

    //Load default values
    getJarBalance()
    getBankBalance();
    getLoggedUser();
    getFinesList();
    getWithdrawalList();


    ContractInstance.getNoOfUsers.call((error, result) => {
        if (!error) {
            UserCount = result.toNumber();
            for (i = 0; i < UserCount; i++) {
                var uid = i;
                (function(uid) {
                    ContractInstance.getUser.call(i, (error, result) => {

                        user = $(".template #user").clone().addClass("user-" + uid)
                        user.find(".name").html(result[0]);
                        user.find(".uid").html(uid);
                        user.find(".user-balance").html(result[2].c[0]);
                        $(".avatars").append(user);
                    });
                })(uid)
            }
        }
    });


}

function DeployContract(bytecode, contract, userName, FineValue) {
    contract.new(userName, FineValue, {
        from: web3.eth.coinbase,
        data: bytecode,
    }, function(e, contract) {
        console.log(e, contract);
        if (typeof contract.address !== 'undefined') {
            console.log('Contract mined! address: ' + contract.address + ' transactionHash: ' + contract.transactionHash);
            contractAddress = contract.address
            $("#contractAddress").html(contractAddress);
            $(".deploy-done").fadeIn()
            $(".loading").fadeOut();
        }
    });
}

function SwitchPage(page1, page2) {
    $(page1).slideUp("slow");
    $(page2).slideDown("slow");
}

function Adduser(uname, uaddress) {

    ContractInstance.addUser(uname, uaddress, { from: web3.eth.coinbase }, (error, result) => {
        if (!error) {

            var uid = $(".avatars #user:last-child").find(".uid").html()
            user = $(".template #user").clone().addClass("user-" + uid)
            user.find(".name").html(uname);
            $(".avatars").append(user);
            UserCount++;
        } else {
            console.log(error)
            alert("Only the creator of this jar can add new members")
        }
    });

}

function Dispute(fid, amount, uid) {
    ContractInstance.DisputeFine(fid, { from: web3.eth.coinbase }, (error, result) => {
        if (!error) {
            setTimeout((function(uid) {
                getJarBalance()
                UpdateUserInfo(uid);
                getFinesList();
            })(uid), 1000);
            if (UserCount > 2) {
                $("#number-needed").text(Math.round(UserCount / 2))
                $(".dispute-notice").fadeIn();
            }

        } else
            console.log(error);

    });

}

function FineUser(uid, amount) {
    ContractInstance.FineUser(uid, amount, { from: web3.eth.coinbase }, (error, result) => {
        if (!error) {
            updateFineBalances(amount, uid);
        } else
            console.log(error);

    });

}

function withDrawFunds(amount, payto) {
    ContractInstance.withDrawFunds(amount, payto, { from: web3.eth.coinbase }, (error, result) => {
        if (!error) {
            getWithdrawalList();

            $("#w-number-needed").text(Math.round(UserCount / 2))


            getBankBalance();
            $(".withdrawal-notice").fadeIn();
        } else
            console.log(error);

    });

}

function verifyWithDrawal(wid) {
    ContractInstance.verifyWithDrawal(wid, { from: web3.eth.coinbase }, (error, result) => {
        if (!error) {

            getWithdrawalList();

            $("#w-number-needed").text(Math.round(UserCount / 2))


            getBankBalance();
            $(".withdrawal-notice").fadeIn();
        } else {
            console.log(error);
            alert("You already veried this withdrawal ")
        }

    });

}

function payAllMyFines(amount, uid) {

    ContractInstance.payAllMyFines({
        from: web3.eth.coinbase,
        value: amount
    }, (error, result) => {
        if (!error) {

            updateFineBalances("-" + $("#current-owned").html(), uid)
            UpdateBankBalance($("#current-owned").html());

        } else {
            console.log(error);

        }

    });

}

function getJarBalance() {
    //Get jar Balance
    ContractInstance.getJarBalance.call((error, result) => {
        if (!error) {
            $("#jarBalance").html(result.toNumber())
        }
    });
}

function getBankBalance() {
    //Get Bank Balance
    ContractInstance.bankBalance.call((error, result) => {
        if (!error) {

            $("#bankBalance").html(result.toNumber())
        }
    });
}

function getLoggedUser() {
    loggedUserAddress = web3.eth.coinbase;
    ContractInstance.getUserByAddress.call(web3.eth.coinbase, (error, result) => {
        if (!error) {

            $(".top-user-welcome #name ").text(result[0])
            loggeduser = result[1].c[0]
                ///$("#jarBalance").html(result.c[0])
        }
    });
}


function getFinesList() {
    ContractInstance.getNoOfFines.call((error, result) => {
        if (!error) {

            $(".fines-table tbody").html("");
            for (i = 0; i < result.c[0]; i++) {
                var fid = i;

                (function(fid) {
                    ContractInstance.Fines.call(i, (error, result) => {

                        var table = '<tr class="fines-list">';

                        table += '<td class="uid">' + result[0].c[0] + '</td>';
                        table += '<td class="amount">' + result[1].c[0] + '</td>';
                        table += '<td >' + result[2] + '</td>';
                        table += '<td >' + result[4] + '</td>';

                        if (result[3] == true)
                            table += '<td > Disputed</</td>';
                        else {

                            if (result[2] == false)
                                table += '<td > <button id="dispute" class="btn-danger action-btn" onclick="Dispute(' + fid + ', ' + result[1].c[0] + ', ' + result[0].c[0] + ')" >Dispute</button></</td>';
                        }
                        table += '</tr>';

                        $(".fines-table tbody").append(table);
                    });
                })(fid);
            }
            //  $("#bankBalance").html(result.c[0])
        }
    });
}

function getWithdrawalList() {
    ContractInstance.getNoOfwithdrawals.call((error, result) => {
        if (!error) {
            $(".withdrawal-table tbody").html("");

            for (i = 0; i < result.c[0]; i++) {
                var wid = i;
                (function(wid) {
                    ContractInstance.Withdrawals.call(i, (error, result) => {

                        var table = '<tr>';

                        table += '<td >' + result[0].c + '</td>';

                        table += '<td >' + result[2] + '</td>';

                        if (result[1] != true) {
                            table += '<td >Pending</td>';
                            table += '<td > <button class="btn-success action-btn" onclick="verifyWithDrawal(' + wid + ')">Verify</button></</td>';
                        } else {
                            table += '<td>Completed</td>';
                        }

                        table += '</tr>';

                        $(".withdrawal-table tbody").append(table);
                    });
                })(wid);
            }

            //  $("#bankBalance").html(result.c[0])
        }
    });
}

function getEitherUSD(either) {
    var Price = either * CurrentEitherPrice;
    return parseFloat(Price).toFixed(2);
}

function updateFineBalances(amount, uid = -1) {
    amount = parseInt(amount);
    $("#owns").html(parseInt($("#owns").html()) + amount)
    $("#jarBalance").html(parseInt($("#jarBalance").html()) + amount)
    $(".user-" + uid + " .user-balance").html(parseInt($(".user-" + uid + " .user-balance").html()) + amount)
    setTimeout(getFinesList(), 1000);
}

function UpdateBankBalance(amount) {
    amount = parseInt(amount);
    $("#bankBalance").html(parseInt($("#bankBalance").html()) + amount)
}

function UpdateUserInfo(uid) {
    ContractInstance.getUser.call(uid, (error, result) => {
        user = $(".user-" + uid);
        user.find(".name").html(result[0]);
        user.find(".uid").html(uid);
        user.find(".user-balance").html(result[2].toNumber());
    });
}