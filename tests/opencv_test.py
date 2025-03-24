import cv2
# img = cv2.imread("tests/Imgs/The Hobbit.jpg")
# small_img = cv2.resize(img, (0, 0), fx=0.1, fy=0.1)

# cv2.imshow("Output", small_img)
# cv2.waitKey(0)

cap = cv2.VideoCapture("tests/Vids/The Hobbit.mp4")

while True:
    success, img = cap.read() 
    if success == True:
        cv2.imshow("Output", img)
    else:
        break
    if cv2.waitKey(34) & 0xFF == ord('q'):
        break
cv2.destroyAllWindows()