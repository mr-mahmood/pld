import React, { ReactNode } from 'react';

interface ErrorCardProps {
    code: number | undefined;
}

const ErrorCard: React.FC<ErrorCardProps> = ({
    code,
}) => {
    return (
        <div className="row">
            <div className="col-md-6 col-xxl-4">
            </div>
            <div className="col-md-6 col-xxl-4">
                <div className="card overflow-hidden b-t-4-danger">
                    <div className="card-body">
                        {code ? (
                            <>
                                <h6>
                                    مشکلی در سرور وجود دارد
                                </h6>
                                <h6>
                                    لطفا وقوع کد ({code}) را به مدیر سیستم اطلاع دهید
                                </h6>
                            </>
                        ) : (
                            <>
                                <h6>
                                    مشکلی در ایجاد ارتباط وجود دارد
                                </h6>
                                <h6>
                                    دلایل احتمالی: خاموش بودن سرور، عدم ارتباط دستگاه شما با سرور و ...
                                </h6>
                            </>
                        )}
                    </div>
                    <img alt="توضیحات تصویر" className="card-img-bottom" src="/images/background/error.jpg" />
                </div>
            </div>
            <div className="col-md-6 col-xxl-4">
            </div>
        </div>
    );
};

export default ErrorCard;