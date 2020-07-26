function addToCart() {
  let xhr = new XMLHttpRequest();
  if (document.getElementById("addtocartbutt").innerText == "add to cart") {
    // document.getElementById("viewcartbutt").innerHTML =
    //   '<a href="/updateCart"><button type="button" class="btn btn-outline-danger" id="addtocartbutt">view cart</button></a>';
    // document.getElementById("checkoutbutt").innerHTML =
    //   '<a onclick="alert("hello");"><button type="button" class="btn btn-outline-danger" id="checkoutbutt">checkout</button></a>';
    let dropDown = document.getElementById("sizing");
    let selectedSize = dropDown
      ? dropDown.options[dropDown.selectedIndex].value
      : "wholecount";
    let count = selectedSize == "wholecount" ? dropDown.options[dropDown.selectedIndex].innerText : "1";
    let url =
      "/cart/" +
      document.getElementById("filename").innerText +
      "/" +
      selectedSize +
      "/" +
      count;
    xhr.onreadystatechange = function (res) {
      if (res.currentTarget.status == 200) {
        window.location.reload();
      }
    };
    xhr.open("POST", url);
    xhr.send();
  } else {
    document.getElementById("viewcartbutt").innerHTML = "";
    document.getElementById("checkoutbutt").innerHTML = "";
    let url = "/cart/" + document.getElementById("filename").innerText;
    xhr.open("DELETE", url);
    xhr.send();
  }
}

function updateStock(count, itemName) {
  console.log(count.value);
  console.log(count.name);
  console.log(itemName);
  let xhr = new XMLHttpRequest();
  let url = "/updateCount/" + itemName + "/" + count.name + "/" + count.value;
  xhr.open("POST", url);
  xhr.send();
}

function updateAttribute(attribute, itemName) {
  console.log(attribute.value);
  console.log(attribute.name);
  console.log(itemName);
  let xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function (res) {
    if (res.currentTarget.status == 200) {
      setTimeout(() => {
        if (attribute.name == "filename") window.location.replace(reloadUrl);
        else window.location.reload();
      });
    }
  };
  let url =
    "/updateAttribute/" +
    itemName +
    "/" +
    attribute.name +
    "/" +
    attribute.value;
  xhr.open("POST", url, true);
  xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8');
  var data = {};
  data.value = attribute.value;
  var json = JSON.stringify(data);
  xhr.send(json);
}

function updateFeatured(featured, itemName) {
  console.log(itemName);
  let xhr = new XMLHttpRequest();
  let url = "/updateFeatured/" + itemName + "/" + featured.value;
  xhr.open("POST", url);
  xhr.send();
}

function updateType(type, itemName) {
  let xhr = new XMLHttpRequest();
  let url = "/updateType/" + itemName + "/" + type.value;
  xhr.open("POST", url);
  xhr.send();
}

function sendSecondaryPicture(filename) {
  let xhr = new XMLHttpRequest();
  let uploadForm = document.getElementById("secondaryUploadForm");
  let form = new FormData(uploadForm);
  xhr.onreadystatechange = function (res) {
    if (res.currentTarget.status == 500) {
      document.getElementById("uploadError").innerHTML =
        "Could not upload try a different name or contact Admin";
    } else if (res.currentTarget.status == 200) {
      setTimeout(() => window.location.reload());
    }
  };
  xhr.open("POST", "/uploadsecondary/" + filename);
  xhr.send(form);
  // Make spinner show while loading
  document.getElementById("secondaryUploadForm").innerHTML =
    '<div class="spinner-border" role="status"><span class="sr-only">Loading...</span></div>';
}

function updateOrder(order, itemName) {
  console.log(itemName);
  let xhr = new XMLHttpRequest();
  let url = "/updateOrder/" + itemName + "/" + order.value;
  xhr.open("POST", url);
  xhr.send();
}

function updateCart(count, itemName) {
  let xhr = new XMLHttpRequest();
  let url = "/updateCart/" + itemName + "/" + count.value;
  xhr.open("POST", url);
  xhr.send();
  // window.location.reload();
}

function sendPicture() {
  let xhr = new XMLHttpRequest();
  let uploadForm = document.getElementById("uploadForm");
  let form = new FormData(uploadForm);
  xhr.onreadystatechange = function (res) {
    if (res.currentTarget.status == 500) {
      document.getElementById("uploadError").innerHTML =
        "Could not upload try a different name or contact Admin";
    } else if (res.currentTarget.status == 200) {
      window.location.href = "/";
    }
  };
  xhr.open("POST", "/upload");
  xhr.send(form);
}
