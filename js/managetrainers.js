import {
  database,
  ref,
  set,
  push,
  onValue,
  remove,
  update,
} from "./firebase-config.js";

document.addEventListener("DOMContentLoaded", function () {
  // DOM Elements
  const trainersTableBody = document.getElementById("trainers-table-body");
  const noTrainersMsg = document.getElementById("no-trainers-msg");
  const addTrainerBtn = document.getElementById("add-trainer-btn");
  const addTrainerModal = document.getElementById("add-trainer-modal");
  const closeTrainerModal = document.getElementById("close-trainer-modal");
  const addTrainerForm = document.getElementById("add-trainer-form");
  const trainerModalTitle = document.getElementById("trainer-modal-title");
  const searchTrainersInput = document.getElementById("search-trainers-input");
  const viewTrainerModal = document.getElementById("view-trainer-modal");
  const closeViewTrainer = document.getElementById("close-view-trainer");
  const viewTrainerContent = document.getElementById("view-trainer-content");
  const prevBtn = document.getElementById("trainers-prev-btn");
  const nextBtn = document.getElementById("trainers-next-btn");
  const toastContainer = document.getElementById("trainers-toast-container");
  const trainerImageInput = document.getElementById("trainer-image");
  const imagePreview = document.getElementById("image-preview");
  const cropModal = document.getElementById("crop-modal");
  const closeCropModal = document.getElementById("close-crop-modal");
  const cancelCropBtn = document.getElementById("cancel-crop-btn");
  const cropImageBtn = document.getElementById("crop-image-btn");
  const imagePreviewCrop = document.getElementById("image-preview-crop");
  const trainersTableHead = document.getElementById("trainers-table-head");
  const trainersPaginationContainer = document.getElementById(
    "trainers-pagination-container"
  );
  const confirmDeleteModal = document.getElementById("confirm-delete-modal");
  const confirmDeleteBtn = document.getElementById("confirm-delete-btn");
  const cancelDeleteBtn = document.getElementById("cancel-delete-btn");

  // State variables
  let trainers = [];
  let currentPage = 1;
  const itemsPerPage = 5;
  let isEditing = false;
  let currentEditId = null;
  let cropper = null;
  let currentImageFile = null;
  let trainerToDelete = null;
  const IMGBB_API_KEY = "3e9be0852ae78b9238da6c41ae04b15e";
  const trainersRef = ref(database, "trainers");

  // Initialize
  setupEventListeners();
  loadTrainers();

  // Functions
  function setupEventListeners() {
    // Modal controls
    addTrainerBtn.addEventListener("click", () => openAddTrainerModal(false));
    closeTrainerModal.addEventListener("click", closeAddTrainerModal);
    closeViewTrainer.addEventListener("click", () =>
      viewTrainerModal.classList.add("hidden")
    );
    closeCropModal.addEventListener("click", closeCropModalHandler);
    cancelCropBtn.addEventListener("click", closeCropModalHandler);

    // Delete confirmation modal
    confirmDeleteBtn.addEventListener("click", confirmDelete);
    cancelDeleteBtn.addEventListener("click", () =>
      confirmDeleteModal.classList.add("hidden")
    );

    // Form submission
    addTrainerForm.addEventListener("submit", handleFormSubmit);

    // Search functionality
    searchTrainersInput.addEventListener("input", () => {
      currentPage = 1;
      renderTrainersTable();
    });

    // Pagination
    prevBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderTrainersTable();
      }
    });

    nextBtn.addEventListener("click", () => {
      const filteredTrainers = getFilteredTrainers();
      if (currentPage * itemsPerPage < filteredTrainers.length) {
        currentPage++;
        renderTrainersTable();
      }
    });

    // Image handling
    trainerImageInput.addEventListener("change", handleImageUpload);
    cropImageBtn.addEventListener("click", applyCrop);
  }

  function loadTrainers() {
    onValue(trainersRef, (snapshot) => {
      const data = snapshot.val();
      trainers = data
        ? Object.entries(data).map(([id, trainer]) => ({ id, ...trainer }))
        : [];
      renderTrainersTable();
    });
  }

  function openAddTrainerModal(editing, trainerId = null) {
    isEditing = editing;
    currentEditId = trainerId;

    if (editing && trainerId) {
      trainerModalTitle.textContent = "Edit Trainer";
      const trainer = trainers.find((t) => t.id === trainerId);
      if (trainer) {
        document.getElementById("trainer-name").value = trainer.name;
        document.getElementById("trainer-email").value = trainer.email;
        document.getElementById("trainer-mobile").value = trainer.mobile;
        document.getElementById("trainer-age").value = trainer.age;
        document.getElementById("trainer-experience").value =
          trainer.experience;
        document.getElementById("trainer-salary").value = trainer.salary;
        document.getElementById("trainer-joined").value = trainer.joinedDate;
        document.getElementById("trainer-shift").value = trainer.shift;
        document.getElementById("trainer-password").value = trainer.password;

        if (trainer.imageUrl) {
          imagePreview.src = trainer.imageUrl;
          imagePreview.classList.remove("hidden");
          currentImageFile = {
            url: trainer.imageUrl,
            deleteUrl: trainer.deleteUrl,
          };
        }
      }
    } else {
      trainerModalTitle.textContent = "Add Trainer";
      addTrainerForm.reset();
      imagePreview.src = "";
      imagePreview.classList.add("hidden");
      currentImageFile = null;
    }

    addTrainerModal.classList.remove("hidden");
  }

  function closeAddTrainerModal() {
    addTrainerModal.classList.add("hidden");
    isEditing = false;
    currentEditId = null;
    addTrainerForm.reset();
    imagePreview.src = "";
    imagePreview.classList.add("hidden");
    currentImageFile = null;
  }

  function closeCropModalHandler() {
    cropModal.classList.add("hidden");
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
  }

  function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    currentImageFile = file;

    if (!file.type.match("image.*")) {
      showToast("Please select an image file", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
      imagePreviewCrop.src = event.target.result;
      cropModal.classList.remove("hidden");

      if (cropper) {
        cropper.destroy();
      }

      imagePreviewCrop.onload = function () {
        cropper = new Cropper(imagePreviewCrop, {
          aspectRatio: 1,
          viewMode: 1,
          autoCropArea: 0.8,
          responsive: true,
          guides: false,
        });
      };
    };
    reader.readAsDataURL(file);
  }

  function applyCrop() {
    if (cropper) {
      const canvas = cropper.getCroppedCanvas({
        width: 400,
        height: 400,
        minWidth: 256,
        minHeight: 256,
        maxWidth: 800,
        maxHeight: 800,
        fillColor: "#fff",
        imageSmoothingEnabled: true,
        imageSmoothingQuality: "high",
      });

      if (canvas) {
        canvas.toBlob(
          async (blob) => {
            try {
              const formData = new FormData();
              formData.append("image", blob, "trainer-image.jpg");

              showToast("Uploading image...", "info");

              const response = await fetch(
                `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
                {
                  method: "POST",
                  body: formData,
                }
              );

              const data = await response.json();

              if (data.success) {
                imagePreview.src = data.data.url;
                imagePreview.classList.remove("hidden");
                currentImageFile = {
                  url: data.data.url,
                  deleteUrl: data.data.delete_url,
                };
                showToast("Image uploaded successfully", "success");
              } else {
                throw new Error(data.error.message || "Failed to upload image");
              }
            } catch (error) {
              console.error("Error uploading image:", error);
              showToast("Failed to upload image", "error");
            } finally {
              closeCropModalHandler();
            }
          },
          "image/jpeg",
          0.9
        );
      }
    }
  }

  async function handleFormSubmit(e) {
    e.preventDefault();

    const formData = {
      name: document.getElementById("trainer-name").value,
      email: document.getElementById("trainer-email").value,
      mobile: document.getElementById("trainer-mobile").value,
      age: document.getElementById("trainer-age").value,
      experience: document.getElementById("trainer-experience").value,
      salary: document.getElementById("trainer-salary").value,
      joinedDate: document.getElementById("trainer-joined").value,
      shift: document.getElementById("trainer-shift").value,
      password: document.getElementById("trainer-password").value,
      imageUrl: currentImageFile?.url || "",
      deleteUrl: currentImageFile?.deleteUrl || "",
    };

    try {
      if (isEditing && currentEditId) {
        // Update existing trainer
        const trainerRef = ref(database, `trainers/${currentEditId}`);
        await update(trainerRef, formData);
        showToast("Trainer updated successfully", "success");
      } else {
        // Add new trainer
        const newTrainerRef = push(trainersRef);
        await set(newTrainerRef, formData);
        showToast("Trainer added successfully", "success");
      }

      closeAddTrainerModal();
    } catch (error) {
      console.error("Error saving trainer:", error);
      showToast("Failed to save trainer", "error");
    }
  }

  function showDeleteConfirmation(trainerId) {
    trainerToDelete = trainerId;
    confirmDeleteModal.classList.remove("hidden");
  }

  async function confirmDelete() {
    if (!trainerToDelete) return;

    confirmDeleteModal.classList.add("hidden");
    const trainer = trainers.find((t) => t.id === trainerToDelete);

    if (!trainer) {
      showToast("Trainer not found", "error");
      return;
    }

    // Delete image from imgBB if exists
    if (trainer.deleteUrl) {
      try {
        const success = await deleteImageFromImgBB(trainer.deleteUrl);
        if (!success) {
          showToast("Failed to delete trainer image", "error");
        }
      } catch (error) {
        console.error("Error deleting image:", error);
        showToast("Error deleting trainer image", "error");
      }
    }

    try {
      const trainerRef = ref(database, `trainers/${trainerToDelete}`);
      await remove(trainerRef);
      showToast("Trainer deleted successfully", "success");
    } catch (error) {
      console.error("Error deleting trainer:", error);
      showToast("Failed to delete trainer", "error");
    }

    trainerToDelete = null;
  }

  async function deleteImageFromImgBB(deleteUrl) {
    if (!deleteUrl) return false;

    try {
      const deleteHash = deleteUrl.split("/").pop();
      if (!deleteHash) return false;

      const deleteEndpoint = `https://api.imgbb.com/1/delete/${deleteHash}`;
      const response = await fetch(deleteEndpoint, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          key: IMGBB_API_KEY,
        }),
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error("Error deleting image:", error);
      return false;
    }
  }

  function getFilteredTrainers() {
    const searchTerm = searchTrainersInput.value.toLowerCase();
    if (!searchTerm) return trainers;

    return trainers.filter(
      (trainer) =>
        trainer.name.toLowerCase().includes(searchTerm) ||
        trainer.email.toLowerCase().includes(searchTerm) ||
        trainer.mobile.toLowerCase().includes(searchTerm)
    );
  }

  function renderTrainersTable() {
    const filteredTrainers = getFilteredTrainers();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedTrainers = filteredTrainers.slice(
      startIndex,
      startIndex + itemsPerPage
    );

    trainersTableBody.innerHTML = "";

    if (filteredTrainers.length === 0) {
      noTrainersMsg.classList.remove("hidden");
      trainersTableHead.classList.add("hidden");
      trainersPaginationContainer.classList.add("hidden");
    } else {
      noTrainersMsg.classList.add("hidden");
      trainersTableHead.classList.remove("hidden");
      trainersPaginationContainer.classList.remove("hidden");

      paginatedTrainers.forEach((trainer) => {
        const row = document.createElement("tr");
        row.className = "border-b border-gray-700 hover:bg-gray-700";
        row.innerHTML = `
          <td class="px-3 py-3">
            <div class="flex items-center gap-3">
              ${
                trainer.imageUrl
                  ? `<img src="${trainer.imageUrl}" alt="${trainer.name}" class="w-10 h-10 rounded-full object-cover">`
                  : `<div class="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                  ${trainer.name.charAt(0).toUpperCase()}
                </div>`
              }
              <span>${trainer.name}</span>
            </div>
          </td>
          <td class="px-3 py-3">${trainer.experience} years</td>
          <td class="px-3 py-3">${trainer.mobile}</td>
          <td class="px-3 py-3">${trainer.shift}</td>
          <td class="px-3 py-3">
            <div class="flex gap-2">
              <button class="view-btn p-1 text-indigo-400 hover:text-indigo-300" data-id="${
                trainer.id
              }">
                <i class="fas fa-eye"></i>
              </button>
              <button class="edit-btn p-1 text-blue-400 hover:text-blue-300" data-id="${
                trainer.id
              }">
                <i class="fas fa-edit"></i>
              </button>
              <button class="delete-btn p-1 text-red-400 hover:text-red-300" data-id="${
                trainer.id
              }">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        `;
        trainersTableBody.appendChild(row);
      });

      document.querySelectorAll(".view-btn").forEach((btn) => {
        btn.addEventListener("click", (e) =>
          viewTrainer(e.target.closest("button").dataset.id)
        );
      });

      document.querySelectorAll(".edit-btn").forEach((btn) => {
        btn.addEventListener("click", (e) =>
          openAddTrainerModal(true, e.target.closest("button").dataset.id)
        );
      });

      document.querySelectorAll(".delete-btn").forEach((btn) => {
        btn.addEventListener("click", (e) =>
          showDeleteConfirmation(e.target.closest("button").dataset.id)
        );
      });
    }

    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage * itemsPerPage >= filteredTrainers.length;
  }

  function viewTrainer(trainerId) {
    const trainer = trainers.find((t) => t.id === trainerId);
    if (!trainer) return;

    viewTrainerContent.innerHTML = `
      <div class="flex justify-center mb-4">
        ${
          trainer.imageUrl
            ? `<img src="${trainer.imageUrl}" alt="${trainer.name}" class="w-32 h-32 rounded-full object-cover">`
            : `<div class="w-32 h-32 rounded-full bg-indigo-500 flex items-center justify-center text-white text-4xl">
            ${trainer.name.charAt(0).toUpperCase()}
          </div>`
        }
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <p class="text-gray-400">Name</p>
          <p class="font-medium">${trainer.name}</p>
        </div>
        <div>
          <p class="text-gray-400">Email</p>
          <p class="font-medium">${trainer.email}</p>
        </div>
        <div>
          <p class="text-gray-400">Mobile</p>
          <p class="font-medium">${trainer.mobile}</p>
        </div>
        <div>
          <p class="text-gray-400">Age</p>
          <p class="font-medium">${trainer.age}</p>
        </div>
        <div>
          <p class="text-gray-400">Experience</p>
          <p class="font-medium">${trainer.experience} years</p>
        </div>
        <div>
          <p class="text-gray-400">Salary</p>
          <p class="font-medium">₹${trainer.salary}</p>
        </div>
        <div>
          <p class="text-gray-400">Joined Date</p>
          <p class="font-medium">${new Date(
            trainer.joinedDate
          ).toLocaleDateString()}</p>
        </div>
        <div>
          <p class="text-gray-400">Shift</p>
          <p class="font-medium">${trainer.shift}</p>
        </div>
      </div>
    `;

    viewTrainerModal.classList.remove("hidden");
  }

  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast p-4 rounded-lg shadow-lg text-white flex items-center justify-between ${getToastClass(
      type
    )}`;
    toast.innerHTML = `
      <div class="flex items-center gap-3">
        <i class="${getToastIcon(type)}"></i>
        <span>${message}</span>
      </div>
      <button class="toast-close ml-4">
        <i class="fas fa-times"></i>
      </button>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("opacity-0", "transition-opacity", "duration-300");
      setTimeout(() => toast.remove(), 300);
    }, 5000);

    toast.querySelector(".toast-close").addEventListener("click", () => {
      toast.classList.add("opacity-0", "transition-opacity", "duration-300");
      setTimeout(() => toast.remove(), 300);
    });
  }

  function getToastClass(type) {
    switch (type) {
      case "success":
        return "bg-green-600";
      case "error":
        return "bg-red-600";
      case "warning":
        return "bg-yellow-600";
      case "info":
        return "bg-blue-600";
      default:
        return "bg-gray-600";
    }
  }

  function getToastIcon(type) {
    switch (type) {
      case "success":
        return "fas fa-check-circle";
      case "error":
        return "fas fa-exclamation-circle";
      case "warning":
        return "fas fa-exclamation-triangle";
      case "info":
        return "fas fa-info-circle";
      default:
        return "fas fa-bell";
    }
  }
});
