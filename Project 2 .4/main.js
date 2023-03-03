/// <reference path="jquery-3.6.0.js" />


$(() => {

    //Initializing important vals:
    let coins = [];
    let checkedCoinsArr = [];
    let count = 0;


    //Showing home when first arriving to the page:
    $("section").hide();
    $("#homeSection").show();



    //Show each section when it's opened:
    $("a").on("click", function () {
        const dataSection = $(this).attr("data-section");
        $("section").hide();
        $("#" + dataSection).show();
    });

    $("#reportSectionButton").on("click", function () {
        $("#loader").hide();
        $("#chartContainer").show();
        changeGraph()
    })




    //Open and close the more info tabs:
    $("#homeDiv").on("click", ".card > button", async function () {
        const coinId = $(this).attr("id");
        const moreInfo = getItemFromLocalStorage(coinId);
        if ($(this).next().html() === "") {
            if (moreInfo === null) {
                $(`#${coinId}loading`).fadeIn("slow");
                const coin = await getMoreInfo(coinId);
                const content = `
        <br>
        $ ${coin.market_data.current_price.usd} <br>
        € ${coin.market_data.current_price.eur} <br>
        ₪ ${coin.market_data.current_price.ils}
        `;
                $(this).next().html(content);
                setWithExpiry(content, coinId);
            } else {
                $(this).next().html(moreInfo);
                setWithExpiry(moreInfo, coinId);
            }
        } else {
            $(this).next().html("");
        }
    });


    //Call the main function:
    handleCoins();


    //Set "more info" in local storage with expiry time of 2 mins:
    function setWithExpiry(value, key) {
        localStorage.setItem(key, JSON.stringify(value));
        setTimeout(function () {
            localStorage.removeItem(key);
        }, 120000);
    }


    //Get more info from local storage if it exists there:
    function getItemFromLocalStorage(coinId) {
        if (localStorage.getItem(coinId) === null) {
            return null;
        }
        const strData = localStorage.getItem(coinId);
        const data = JSON.parse(strData);
        return data;
    }


    //Search bar & synchronizing checkboxes while searching:
    $("input[type=search]").on("keyup", function () {
        const textToSearch = $(this).val().toLowerCase();
        if (textToSearch === "") {
            handleCoins();
        } else {
            const filteredCoins = coins.filter(
                (c) => c.symbol.indexOf(textToSearch) >= 0
            );
            if (filteredCoins.length > 0) {
                displayCoins(filteredCoins);
            } else {
                $("#homeDiv").html(`<p class="noCoinsFoundDiv">No Coins Found</p>`);
            }
        }
        syncCoins();

        $("input[type=checkbox]").on("change", function () {

            if ($(this).prop("checked") === true) {
                count++;
                checkedCoinsArr.push(this.id);
            } else {
                count--;
                const index = checkedCoinsArr.indexOf(this.id);
                checkedCoinsArr.splice(index, 1);
            }
            checkFiveCoins();
        })
    });



    //Main function - calls & controls most of the other functions:
    async function handleCoins() {
        try {
            coins = await getJSON("https://api.coingecko.com/api/v3/coins");
            displayCoins(coins);
            syncCoins();

            $("input[type=checkbox]").on("change", function () {
                if ($(this).prop("checked") === true) {
                    count++;
                    checkedCoinsArr.push(this.id);
                } else {
                    count--;
                    const index = checkedCoinsArr.indexOf(this.id);
                    checkedCoinsArr.splice(index, 1);
                }
                checkFiveCoins();
            });

        } catch (err) {
            alert(err.message);
        }
    }


    //Display the coins sent to this function on page:
    function displayCoins(coins) {
        let content = "";
        for (const coin of coins) {
            const card = createCard(coin);
            content += card;
        }
        $("#homeDiv").html(content);
        $(`.loading`).hide();
    }


    //Create a card for the coin sent to this function:
    function createCard(coin) {
        const card = `
            <div class="card" id="${coin.id}card">
                  <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" role="switch" id="${coin.symbol}">
                  </div>
                <span>${coin.symbol}</span> <br>
                <span>${coin.name}</span> <br>
                <img src="${coin.image.thumb}" /> <br>
                <div class="loading" id="${coin.id}loading"></div>
                <button type="button" class="btn btn-outline-dark" id="${coin.id}">More Info</button>
                <div></div>
            </div>
        `;
        return card;
    }


    //AJAX request for "more info" of a coin:
    async function getMoreInfo(coinId) {
        const coin = await getJSON(
            "https://api.coingecko.com/api/v3/coins/" + coinId
        );
        $(`#${coinId}loading`).hide();
        return coin;
    }



    //AJAX request for coins:
    function getJSON(url) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url,
                success: (data) => {
                    resolve(data);
                },
                error: (err) => {
                    reject(err);
                },
            });
        });
    }

    //Add the checked coins to the modal:
    function addToModal(coin) {
        let content = $("#innerModalDiv").html();
        const card = createCard(coin);
        content += card;
        $("#innerModalDiv").html(content);
        $(`button`).hide();
        $("#innerModalDiv").find("input[type=checkbox]").prop("checked", true);
    }


    //Check to see if more than 5 coins are checked:
    async function checkFiveCoins() {
        if (count > 5) {
            changeModal(6);
            $("#myModal").show();
        } else {
            changeBar()
        }
    }


    //Open and activate the modal and its code:
    function changeModal(modalCount) {
        $("#innerModalDiv").html("");
        $("#closeModalSpan").addClass("disabled");
        for (coin of coins) {
            for (checkedCoin of checkedCoinsArr) {
                if (checkedCoin === coin.symbol) {
                    addToModal(coin);
                }
            }
        }

        $(".loading").hide();
        $("input[type=checkbox]").on("change", function () {

            if (!$("#innerModalDiv").is(":visible")) {
                return
            }

            if ($(this).prop("checked") === false) {
                modalCount--;
                const index = checkedCoinsArr.indexOf(this.id);
                checkedCoinsArr.splice(index, 1);
            } else {
                if (!checkDuplicates(this.id)) {
                    modalCount++;
                    checkedCoinsArr.push(this.id);
                }
            }
            if (modalCount === 5) {
                $("#closeModalSpan").removeClass("disabled");
            } else {
                $("#closeModalSpan").addClass("disabled");
            }
        });

        $("#closeModalSpan").on("click", function () {
            syncCoins();
            count === 5;
            $("#myModal").hide();
            $(`button`).show();
            return
        });
    }



    //Make sure the checked coins are synced:
    function syncCoins() {
        count = 0;

        $("input[type=checkbox]").prop("checked", false);
        for (let i = 0; i < checkedCoinsArr.length; i++) {
            $(`#${checkedCoinsArr[i]}`).prop("checked", true);
            count++;
        }

    }

    //Make sure there are no duplicates in the array of checked coins:
    function checkDuplicates(name) {
        for (let i = 0; i < checkedCoinsArr.length; i++) {
            if (name === checkedCoinsArr[i]) {
                return true
            }
        }
        return false;
    }


    //Change the progress bar by how many coins are checked:
    function changeBar() {
        content = `
          <div
          class="progress-bar progress-bar-striped progress-bar-animated"
          role="progressbar"
          aria-valuenow="${20 * count}"
          aria-valuemin="0"
          aria-valuemax="100"
          style="width: ${20 * count}%"
          ></div>
        `;
        $("#progressBar").html(content);
    }





    //Activate and change (on-interval) the report graph on account of the checked coins:
    async function changeGraph() {

        console.log(checkedCoinsArr);

        let str = "";
        for (let i = 0; i < checkedCoinsArr.length; i++) {
            str += checkedCoinsArr[i];
            if (i !== checkedCoinsArr.length - 1) {
                str += ",";
            }
        }
        if (str.length === 0) {
            $("#chartContainer").hide();
            $("#noCoinsDiv").show();
            return
        }

        $("#noCoinsDiv").hide();
        $("#loader").show()
        options = graphReport()

        for (let i = 1; i <= 5; i++) {
            newAxis = "axisY" + i;
            if (checkedCoinsArr[i - 1] === undefined) {
                options.data[i - 1].name = ""
            } else {
                options.data[i - 1].name = checkedCoinsArr[i - 1];
            }
        }
        const intervalID = setInterval(getCoins, 2000);
        $("#homeSectionButton, #aboutSectionButton").on("click", function () {
            clearInterval(intervalID);
            for (let i = 0; i < checkedCoinsArr.length; i++) {
                options.data[i].dataPoints = [{ x: 0, y: 0 }];
            }
            options = graphReport();
            return
        });

        async function getCoins() {
            const url = "https://min-api.cryptocompare.com/data/pricemulti?fsyms=" + str + "&tsyms=USD";
            const coins = await getJSON(url);
            addToGraph(coins);
        }
    }


    //Add the coins sent to this function to the graph:
    function addToGraph(coins) {

        let now = new Date($.now());

        const graphArr = [];
        for (const prop in coins) {
            const coin = coins[prop];
            const dollar = coin.USD;
            graphArr.push(dollar);
        }
        for (let i = 0; i < graphArr.length; i++) {
            let arr = options.data[i].dataPoints;
            arr.push({ x: now, y: graphArr[i] })
        }
        $("#loader").hide();
        $("#chartContainer").CanvasJSChart(options);
    }



    //The data and build of the report graph:
    function graphReport() {

        try {
            let options = {
                animationEnabled: false,
                responsive: true,
                maintainAspectRatio: false,
                title: {
                    text: "Dynamic Crypto Currency Graph"
                },
                subtitles: [{
                    text: "Including the Checked Coins"
                }],
                axisX: {
                    title: "Time"
                },
                axisY1: {
                    title: "",
                    titleFontColor: "blue",
                    lineColor: "blue",
                    labelFontColor: "blue",
                },
                axisY2: {
                    title: "",
                    titleFontColor: "red",
                    lineColor: "red",
                    labelFontColor: "red",
                },
                axisY3: {
                    title: "",
                    titleFontColor: "yellow",
                    lineColor: "yellow",
                    labelFontColor: "yellow",
                },
                axisY4: {
                    title: "",
                    titleFontColor: "green",
                    lineColor: "green",
                    labelFontColor: "green",
                },
                axisY5: {
                    title: "",
                    titleFontColor: "purple",
                    lineColor: "purple",
                    labelFontColor: "purple",
                },

                toolTip: {
                    shared: true
                },
                legend: {
                    cursor: "pointer",
                    itemclick: toggleDataSeries
                },
                data: [{
                    type: "spline",
                    name: "",
                    showInLegend: true,
                    xValueFormatString: "MMM YYYY",
                    yValueFormatString: "$#,##0.#",
                    dataPoints: []
                },
                {
                    type: "spline",
                    name: "",
                    showInLegend: true,
                    xValueFormatString: "MMM YYYY",
                    yValueFormatString: "$#,##0.#",
                    dataPoints: []
                },
                {
                    type: "spline",
                    name: "",
                    showInLegend: true,
                    xValueFormatString: "MMM YYYY",
                    yValueFormatString: "$#,##0.#",
                    dataPoints: []
                },
                {
                    type: "spline",
                    name: "",
                    showInLegend: true,
                    xValueFormatString: "MMM YYYY",
                    yValueFormatString: "$#,##0.#",
                    dataPoints: []
                },
                {
                    type: "spline",
                    name: "",
                    showInLegend: true,
                    xValueFormatString: "MMM YYYY",
                    yValueFormatString: "$#,##0.#",
                    dataPoints: []
                }]
            };
            $("#chartContainer").CanvasJSChart(options);

            function toggleDataSeries(e) {
                if (typeof (e.dataSeries.visible) === "undefined" || e.dataSeries.visible) {
                    e.dataSeries.visible = false;
                } else {
                    e.dataSeries.visible = true;
                }
                e.chart.render();
            }
            return options;
        } catch (err) {
            alert(err.message);
        }
    }

    
});





