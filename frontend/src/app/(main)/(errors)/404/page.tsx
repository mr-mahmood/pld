"use client";


export default function error_404() {
    return (
        <>
            <div className="error-container p-0 b-r-25">
                <div className="container">
                    <div>
                        <div>
                            <img alt="توضیحات تصویر" className="img-fluid" src="/images/background/error-404.png"></img>
                        </div>
                        <div className="row justify-content-center">
                            <h3 className="text-primary">
                                صفحه مورد نظر شما یافت نشد
                            </h3>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
